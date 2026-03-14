#!/usr/bin/env node
/**
 * Component Generator
 * Generates React component following coding conventions
 */

import { COMPONENT_CONVENTIONS } from "../conventions.mjs";
import { toCamelCase, toPascalCase } from "../naming.mjs";

function parseProps(propsString) {
  if (!propsString) {
    return [];
  }

  const props = [];
  for (const rawProp of propsString.split(",")) {
    const prop = rawProp.trim();
    if (!prop.includes(":")) {
      continue;
    }
    const [name, ...rest] = prop.split(":");
    props.push({
      name: name.trim(),
      type: rest.join(":").trim(),
    });
  }
  return props;
}

export function generateComponent(name, componentType = "ui", propsString = null, includeJsdoc = true, includeTest = true) {
  const normalizedName = toPascalCase(name);
  const props = parseProps(propsString);

  const propsInterfaceName = `${normalizedName}Props`;
  const propsInterface =
    props.length > 0 ? props.map((p) => `${p.name}: ${p.type};`).join("\n  ") : "// Add props here";
  const propsDestructure = props.length > 0 ? props.map((p) => p.name).join(", ") : "";

  let jsdoc = "";
  if (includeJsdoc && COMPONENT_CONVENTIONS.jsdoc_required) {
    let jsdocParams = " * @param props - 컴포넌트 Props";
    if (props.length > 0) {
      jsdocParams = props.map((p) => ` * @param props.${p.name} - ${p.name} 설명`).join("\n");
    }
    jsdoc = `/**
 * ${normalizedName} 컴포넌트
${jsdocParams}
 */
`;
  }

  const componentCode = `${jsdoc}interface ${propsInterfaceName} {
  ${propsInterface}
}

const ${normalizedName} = (props: ${propsInterfaceName}) => {
  ${propsDestructure ? `const { ${propsDestructure} } = props;` : "// const { } = props;"}

  return (
    <div>
      {/* TODO: UI 구현 */}
    </div>
  );
};

export default ${normalizedName};
`;

  let testCode = "";
  if (includeTest) {
    testCode = `import { render } from '@testing-library/react';
import ${normalizedName} from '../index';

describe('${normalizedName}', () => {
  it('컴포넌트가 렌더링된다', () => {
    // Arrange
    const props = {${props.length > 0 ? "\n      " : ""}
      // Add test props here
    };

    // Act
    const { container } = render(<${normalizedName} {...props} />);

    // Assert
    expect(container.firstChild).toBeTruthy();
  });
});
`;
  }

  return {
    component: componentCode,
    test: testCode,
    folder: `${toCamelCase(normalizedName)}/`,
    component_file: "index.tsx",
    test_file: "__tests__/index.test.tsx",
  };
}

