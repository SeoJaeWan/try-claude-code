#!/usr/bin/env node

/**
 * visual-compare.mjs — pixelmatch 를 이용한 픽셀 단위 이미지 비교.
 *
 * 사용법: node visual-compare.mjs <reference.png> <current.png> [diff.png] [threshold]
 *
 * threshold: 0-1 색상 민감도(낮을수록 엄격). 기본값: 0.1
 * 출력: mismatch 통계 JSON + diff 이미지 파일
 */

import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const [, , refPath, curPath, diffPath = "diff.png", thresholdStr = "0.1"] =
  process.argv;

if (!refPath || !curPath) {
  console.error(
    "Usage: node visual-compare.mjs <reference> <current> [diff] [threshold]"
  );
  process.exit(1);
}

const ref = PNG.sync.read(fs.readFileSync(refPath));
const cur = PNG.sync.read(fs.readFileSync(curPath));

const width = Math.max(ref.width, cur.width);
const height = Math.max(ref.height, cur.height);

/**
 * 이미지를 흰색 배경으로 패딩해 목표 크기에 맞춘다.
 * reference 와 current 의 크기가 다를 때도 비교가 가능하게 한다.
 *
 * @param {PNG} img - 원본 이미지.
 * @param {number} w - 목표 너비(픽셀).
 * @param {number} h - 목표 높이(픽셀).
 * @returns {PNG} 패딩된 이미지(크기가 같으면 원본을 그대로 반환).
 */
function padImage(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const padded = new PNG({ width: w, height: h, fill: true });
  for (let i = 0; i < padded.data.length; i += 4) {
    padded.data[i] = 255;
    padded.data[i + 1] = 255;
    padded.data[i + 2] = 255;
    padded.data[i + 3] = 255;
  }
  PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
  return padded;
}

const refPadded = padImage(ref, width, height);
const curPadded = padImage(cur, width, height);
const diff = new PNG({ width, height });

const mismatchedPixels = pixelmatch(
  refPadded.data,
  curPadded.data,
  diff.data,
  width,
  height,
  { threshold: parseFloat(thresholdStr), includeAA: false }
);

fs.writeFileSync(diffPath, PNG.sync.write(diff));

const totalPixels = width * height;
const mismatchRate = ((mismatchedPixels / totalPixels) * 100).toFixed(2);

console.log(
  JSON.stringify(
    {
      reference: { width: ref.width, height: ref.height },
      current: { width: cur.width, height: cur.height },
      sizeMismatch: ref.width !== cur.width || ref.height !== cur.height,
      mismatchedPixels,
      totalPixels,
      mismatchRate: `${mismatchRate}%`,
      diffImage: diffPath,
      passed: parseFloat(mismatchRate) < 1,
    },
    null,
    2
  )
);
