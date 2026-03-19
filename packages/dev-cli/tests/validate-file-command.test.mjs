import test from "node:test";
import assert from "node:assert/strict";

import {
  createTempRepo,
  readJson,
  runCli,
  tcpBin,
  tcfBin,
  tcbBin
} from "./test-utils.mjs";

const tsconfig = {
  compilerOptions: {
    baseUrl: ".",
    paths: {
      "@/*": ["./*"]
    }
  }
};

test("tcp validate-file는 디렉터리 하나를 재귀 탐색해 퍼블리셔 엔트리를 검증한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "tcp/personal/v1"],
    files: {
      "components/common/dashboardLayout/index.tsx": `interface DashboardLayoutProps {}

const DashboardLayout = (_props: DashboardLayoutProps) => {
  return <section />;
};

export default DashboardLayout;
`,
      "components/common/reviewCard/index.tsx": `interface ReviewCardProps {}

const ReviewCard = (_props: ReviewCardProps) => {
  return <section />;
};

export default ReviewCard;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "components/common"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.deepEqual(payload.discovery, {
    root: "components/common",
    scanned: 2,
    matched: 2,
    skipped: 0
  });
  assert.deepEqual(payload.summary, {
    total: 2,
    passed: 2,
    failed: 0
  });
});

test("validate-file는 파일 경로 입력을 거부한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "tcp/personal/v1"],
    files: {
      "components/common/dashboardLayout/index.tsx": `interface DashboardLayoutProps {}

const DashboardLayout = (_props: DashboardLayoutProps) => {
  return <section />;
};

export default DashboardLayout;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "components/common/dashboardLayout/index.tsx"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "VALIDATE_FILE_DIRECTORY_ONLY");
});

test("validate-file는 복수 경로 입력을 거부한다", async () => {
  const result = runCli(tcpBin, [
    "validate-file",
    "components/common",
    "app"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "INVALID_VALIDATE_FILE_SPEC");
});

test("validate-file는 --root 같은 legacy 옵션을 거부한다", () => {
  const result = runCli(tcpBin, [
    "validate-file",
    "--root",
    "app"
  ]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNKNOWN_OPTION");
});

test("validate-file는 매칭 파일이 하나도 없는 디렉터리에 대해 힌트 포함 unsupported 오류를 반환한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "tcp/personal/v1"],
    files: {
      "docs/readme.md": "# docs\n",
      "docs/example.ts": "export const value = 1;\n"
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "docs"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNSUPPORTED_VALIDATION_TARGET");
  assert.equal(payload.error.details.directory, "docs");
  assert.ok(payload.error.details.supportedPatterns.length > 0);
  assert.ok(payload.error.details.exampleDirectories.length > 0);
  assert.match(payload.error.details.suggestion, /validate-file/);
});

test("tcp validate-file는 디렉터리 하위에서 invalid entry를 함께 집계한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "tcp/personal/v1"],
    files: {
      "app/showcase/page.tsx": `const Page = () => {
  return <section />;
};

export default Page;
`,
      "app/showcase/reviewCard/index.tsx": `interface ReviewCardProps {}

const ReviewCard = (_props: ReviewCardProps) => {
  return <section />;
};

export default ReviewCard;
`,
      "app/showcase/review-card/index.tsx": `interface ReviewCardProps {}

const ReviewCard = (_props: ReviewCardProps) => {
  return <section />;
};

export default ReviewCard;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "app"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  assert.deepEqual(payload.discovery, {
    root: "app",
    scanned: 3,
    matched: 3,
    skipped: 0
  });
  assert.deepEqual(payload.summary, {
    total: 3,
    passed: 2,
    failed: 1
  });
  const invalidPathResult = payload.results.find((item) => item.file.endsWith("review-card/index.tsx"));
  assert.ok(invalidPathResult.violations.some((item) => item.code === "INVALID_PATH_SEGMENT"));
});

test("tcf validate-file는 디렉터리 하위 hook 규칙 위반을 함께 검증한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "tcf/personal/v1"],
    files: {
      "hooks/utils/common/useScroll/index.ts": `const useScroll = () => {
  return {
    value: 1
  };
};

export default useScroll;
`,
      "hooks/apis/auth/mutations/useGetLogin/index.ts": `const useGetLogin = () => {
  return {};
};

export default useGetLogin;
`,
      "hooks/utils/common/helper.ts": "export const helper = true;\n"
    }
  });

  const result = runCli(tcfBin, [
    "validate-file",
    "hooks"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  assert.deepEqual(payload.discovery, {
    root: "hooks",
    scanned: 3,
    matched: 2,
    skipped: 1
  });
  assert.deepEqual(payload.summary, {
    total: 2,
    passed: 1,
    failed: 1
  });
  const invalidHook = payload.results.find((item) => item.file.endsWith("useGetLogin/index.ts"));
  const codes = invalidHook.violations.map((item) => item.code);
  assert.ok(codes.includes("INVALID_API_METHOD"));
  assert.ok(codes.includes("INVALID_HOOK_NAME"));
});

test("tcb validate-file는 없는 명령으로 명시적으로 실패한다", () => {
  const result = runCli(tcbBin, ["validate-file", "--help"]);

  assert.equal(result.status, 1);
  const payload = readJson(result.stderr);
  assert.equal(payload.error.code, "UNKNOWN_COMMAND");
});

test("tcp validate-file는 ownership rule 위반을 directory scan에서도 검출한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "tcp/personal/v1"],
    tsconfig,
    files: {
      "components/common/table/index.tsx": `interface TableProps {}
import Th from "./th";

const Table = (_props: TableProps) => {
  return <table><tbody><tr><Th /></tr></tbody></table>;
};

export default Table;
`,
      "components/common/table/th/index.tsx": `interface ThProps {}

const Th = (_props: ThProps) => {
  return <th />;
};

export default Th;
`,
      "components/common/card/index.tsx": `interface CardProps {}
import Th from "@/components/common/table/th";

const Card = (_props: CardProps) => {
  return <table><tbody><tr><Th /></tr></tbody></table>;
};

export default Card;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "components/common"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  const thResult = payload.results.find((item) => item.file.endsWith("table/th/index.tsx"));
  const ownershipViolation = thResult.violations.find((item) => item.code === "PARENT_ONLY_CHILD_REUSED");

  assert.ok(ownershipViolation);
  assert.match(ownershipViolation.suggestion, /components\/common\/th\/index\.tsx/);
});
