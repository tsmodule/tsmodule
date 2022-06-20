/**
 * @fileoverview
 *
 * This contains the install command, which applies standardized project
 * settings, files, and dependencies.
 */

import { TsmoduleProjectType } from "../../specification";
import { applySpecification } from "../create/lib/templates";
import { getPackageJson } from "../../utils/packageJson";

export const convert = async () => {
  let template: TsmoduleProjectType = "default";
  const packageJson = await getPackageJson();

  if (packageJson?.dependencies?.react) {
    template = "react";
  }

  await applySpecification({
    template,
    targetDir: process.cwd(),
  });
};