import test from "node:test";
import assert from "node:assert/strict";

import {
  createTempRepo,
  readJson,
  runCli,
  tcpBin,
  tcfBin
} from "./test-utils.mjs";

const tsconfig = {
  compilerOptions: {
    baseUrl: ".",
    paths: {
      "@/*": ["./*"]
    }
  }
};

test("tcp validate-file는 올바른 컴포넌트 파일을 통과시킨다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "publisher/personal/v1"],
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

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.summary, {
    total: 1,
    passed: 1,
    failed: 0
  });
  assert.equal(payload.results[0].command, "component");
});

test("tcp validate-file는 app page 같은 퍼블리셔 파일도 AST-only로 검증한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "publisher/personal/v1"],
    files: {
      "app/showcase/page.tsx": `const Page = () => {
  return <section />;
};

export default Page;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "app/showcase/page.tsx"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.results[0].command, "component");
  assert.deepEqual(payload.results[0].violations, []);
});

test("tcp validate-file는 prefix가 있어도 내부 components 경로 기준으로 배치 규칙을 검증한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "publisher/personal/v1"],
    files: {
      "plugin/skills/ui-publish-workspace/outputs/components/common/ReviewCard/index.tsx": `interface ReviewCardProps {}

const ReviewCard = (_props: ReviewCardProps) => {
  return <section />;
};

export default ReviewCard;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "plugin/skills/ui-publish-workspace/outputs/components/common/ReviewCard/index.tsx"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  const codes = payload.results[0].violations.map((item) => item.code);

  assert.ok(codes.includes("INVALID_PATH_SEGMENT"));
});

test("tcp validate-file는 폴더명 case와 same-file JSX helper/subcomponent를 검증한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "publisher/personal/v1"],
    files: {
      "components/common/DashboardLayout/index.tsx": `interface DashboardLayoutProps {}

const DashboardLayout = (_props: DashboardLayoutProps) => {
  const renderHeader = () => <header />;
  const StatsCard = () => <aside />;

  return (
    <section>
      {renderHeader()}
      <StatsCard />
    </section>
  );
};

export default DashboardLayout;
`
    }
  });

  const result = runCli(tcpBin, [
    "validate-file",
    "components/common/DashboardLayout/index.tsx"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  const codes = payload.results[0].violations.map((item) => item.code);

  assert.ok(codes.includes("INVALID_PATH_SEGMENT"));
  assert.ok(codes.includes("SAME_FILE_JSX_HELPER"));
  assert.ok(codes.includes("SAME_FILE_SUBCOMPONENT"));
});

test("tcp validate-file는 parent-only child의 외부 재사용을 alias import까지 포함해 검출한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "publisher/personal/v1"],
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
    "components/common/table/th/index.tsx"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  const ownershipViolation = payload.results[0].violations.find(
    (item) => item.code === "PARENT_ONLY_CHILD_REUSED"
  );

  assert.ok(ownershipViolation);
  assert.match(ownershipViolation.suggestion, /components\/common\/th\/index\.tsx/);
});

test("tcf validate-file는 pure helper를 허용한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "frontend/personal/v1"],
    files: {
      "hooks/utils/common/useScroll/index.ts": `const buildParams = (axis: "x" | "y") => {
  return { axis };
};

const mapResponse = (value: number) => {
  return value;
};

const useScroll = () => {
  return {
    buildParams: buildParams("y"),
    value: mapResponse(1)
  };
};

export default useScroll;
`
    }
  });

  const result = runCli(tcfBin, [
    "validate-file",
    "hooks/utils/common/useScroll/index.ts"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 0);
  const payload = readJson(result.stdout);
  assert.equal(payload.ok, true);
});

test("tcf validate-file는 JSX helper, React component, 추가 hook 선언을 금지한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "frontend/personal/v1"],
    files: {
      "hooks/utils/common/useLoginForm/index.ts": `const renderSkeleton = () => <div />;
const LoginPreview = () => <div />;
const useFilter = () => {
  return "all";
};

const useLoginForm = () => {
  return {
    filter: useFilter()
  };
};

export default useLoginForm;
`
    }
  });

  const result = runCli(tcfBin, [
    "validate-file",
    "hooks/utils/common/useLoginForm/index.ts"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  const codes = payload.results[0].violations.map((item) => item.code);

  assert.ok(codes.includes("JSX_HELPER_IN_HOOK_FILE"));
  assert.ok(codes.includes("REACT_COMPONENT_IN_HOOK_FILE"));
  assert.ok(codes.includes("ADDITIONAL_HOOK_DECLARATION"));
});

test("tcf validate-file는 apiHook 이름, method, kind 조합을 검증한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "frontend/personal/v1"],
    files: {
      "hooks/apis/auth/mutations/useGetLogin/index.ts": `const useGetLogin = () => {
  return {};
};

export default useGetLogin;
`
    }
  });

  const result = runCli(tcfBin, [
    "validate-file",
    "hooks/apis/auth/mutations/useGetLogin/index.ts"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  const codes = payload.results[0].violations.map((item) => item.code);

  assert.ok(codes.includes("INVALID_API_METHOD"));
  assert.ok(codes.includes("INVALID_HOOK_NAME"));
});

test("validate-file는 JSON files 배열, file not found, parse error를 함께 집계한다", async () => {
  const tempRoot = await createTempRepo({
    profiles: ["shared/personal/v1", "frontend/personal/v1"],
    files: {
      "hooks/utils/common/useScroll/index.ts": `const useScroll = () => {
  return {
    value: 1
  };
};

export default useScroll;
`,
      "hooks/utils/common/useBroken/index.ts": `const useBroken = () => {
  return {
    value:
  };
};

export default useBroken;
`
    }
  });

  const result = runCli(tcfBin, [
    "validate-file",
    "--json",
    "{\"files\":[\"hooks/utils/common/useScroll/index.ts\",\"hooks/utils/common/useMissing/index.ts\",\"hooks/utils/common/useBroken/index.ts\"]}"
  ], {
    cwd: tempRoot
  });

  assert.equal(result.status, 1);
  const payload = readJson(result.stdout);
  assert.deepEqual(payload.summary, {
    total: 3,
    passed: 1,
    failed: 2
  });
  assert.equal(
    payload.results.find((item) => item.file.endsWith("useMissing/index.ts")).violations[0].code,
    "FILE_NOT_FOUND"
  );
  assert.equal(
    payload.results.find((item) => item.file.endsWith("useBroken/index.ts")).violations[0].code,
    "TS_PARSE_ERROR"
  );
});
