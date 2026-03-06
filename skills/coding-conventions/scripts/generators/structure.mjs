#!/usr/bin/env node
/**
 * Folder Structure Generator
 * Creates folder structure for Next.js or NestJS
 */

import fs from "fs";
import path from "path";
import { FOLDER_STRUCTURE_CONVENTIONS } from "../conventions.mjs";
import { toPascalCase } from "../naming.mjs";

function detectFramework(projectRoot = process.cwd()) {
  const packageJson = path.join(projectRoot, "package.json");
  if (!fs.existsSync(packageJson)) {
    return "unknown";
  }

  try {
    const data = JSON.parse(fs.readFileSync(packageJson, "utf8"));
    const deps = {
      ...(data.dependencies || {}),
      ...(data.devDependencies || {}),
    };
    if ("next" in deps) {
      return "nextjs";
    }
    if ("@nestjs/core" in deps || "@nestjs/common" in deps) {
      return "nestjs";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function generateStructure(
  inputPath,
  structureType = "page",
  framework = null,
  includeGitkeep = true,
  createFiles = false,
  outputDir = null
) {
  let targetFramework = framework;
  if (!targetFramework) {
    targetFramework = detectFramework();
  }

  if (targetFramework === "unknown") {
    return {
      error: "Framework not detected. Specify --framework nextjs or --framework nestjs",
    };
  }

  const normalizedPath = inputPath.replace(/^\/+|\/+$/g, "");
  let structure = {};

  if (targetFramework === "nextjs") {
    if (structureType === "page") {
      const basePath = `app/(main)/${normalizedPath}`;
      structure = {
        folders: [`${basePath}/`, `${basePath}/components/`, `${basePath}/hooks/`],
        files: [[`${basePath}/page.tsx`, "const Page = () => {\n  return <div>Page</div>;\n};\n\nexport default Page;\n"]],
      };
      if (includeGitkeep) {
        structure.files.push([`${basePath}/components/.gitkeep`, ""]);
        structure.files.push([`${basePath}/hooks/.gitkeep`, ""]);
      }
    } else if (structureType === "api") {
      const basePath = `app/api/${normalizedPath}`;
      structure = {
        folders: [`${basePath}/`],
        files: [[`${basePath}/route.ts`, "export async function GET() {\n  return Response.json({ data: 'Hello' });\n}\n"]],
      };
    }
  } else if (targetFramework === "nestjs" && structureType === "module") {
    const basePath = `src/${normalizedPath}`;
    const moduleName = normalizedPath.split("/").at(-1) || normalizedPath;
    const className = toPascalCase(moduleName);
    structure = {
      folders: [`${basePath}/`, `${basePath}/dto/`],
      files: [
        [
          `${basePath}/${moduleName}.controller.ts`,
          `import { Controller } from '@nestjs/common';\n\n@Controller('${moduleName}')\nexport class ${className}Controller {}\n`,
        ],
        [
          `${basePath}/${moduleName}.service.ts`,
          `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class ${className}Service {}\n`,
        ],
        [
          `${basePath}/${moduleName}.module.ts`,
          `import { Module } from '@nestjs/common';\nimport { ${className}Controller } from './${moduleName}.controller';\nimport { ${className}Service } from './${moduleName}.service';\n\n@Module({\n  controllers: [${className}Controller],\n  providers: [${className}Service]\n})\nexport class ${className}Module {}\n`,
        ],
      ],
    };
    if (includeGitkeep) {
      structure.files.push([`${basePath}/dto/.gitkeep`, ""]);
    }
  }

  if (createFiles) {
    const root = outputDir || process.cwd();
    const created = [];
    for (const folder of structure.folders || []) {
      const folderPath = path.join(root, folder);
      fs.mkdirSync(folderPath, { recursive: true });
      created.push(`📁 ${folder}`);
    }
    for (const [filePath, content] of structure.files || []) {
      const fullPath = path.join(root, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf8");
      created.push(`📄 ${filePath}`);
    }
    structure.created = created;
  }

  structure.framework = targetFramework;
  structure.type = structureType;
  structure.path = normalizedPath;
  return structure;
}

