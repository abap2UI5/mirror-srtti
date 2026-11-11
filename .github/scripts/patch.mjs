// Local patches on top of the renamed copy of sandraros/S-RTTI.
//
// The build regenerates src/ from upstream every week, so a change made in
// src/ by hand - or in abap2UI5's src/00/02, which is a copy of this one - is
// gone with the next run. Whatever this copy needs beyond the rename is listed
// here and re-applied as the last step of the build. Each patch names the
// exact upstream text it replaces: when upstream changes that text the run
// fails instead of silently shipping an unpatched file - then adjust or drop
// the patch.

import { readFileSync, writeFileSync } from "node:fs";

const patches = [
  {
    // A component whose type description cannot be rebuilt (get_rtti raises)
    // falls back to the elementary type of the same kind, length and
    // decimals, instead of failing the whole structure. The fallback was
    // made in abap2UI5's src/00/02 directly and never reached this mirror, so
    // the mirror workflow there proposed to delete it (abap2UI5/abap2UI5#2997).
    // Written without inline declarations: everything else in this copy is
    // valid on 7.02 (abaplint.json), and the framework's version of the
    // fallback was the only 7.40 syntax in the package.
    file: "src/z2ui5_cl_srt_structdescr.clas.abap",
    find: `      component_rtti-type       ?= <component>-type->get_rtti( ).\n`,
    replace:
      `\n` +
      `      TRY.\n` +
      `          component_rtti-type       ?= <component>-type->get_rtti( ).\n` +
      `        CATCH cx_root.\n` +
      `          DATA lv_method TYPE string.\n` +
      `          lv_method = 'GET_BY_KIND'.\n` +
      `          CALL METHOD cl_abap_elemdescr=>(lv_method)\n` +
      `            EXPORTING\n` +
      `              p_type_kind = <component>-type->type_kind\n` +
      `              p_length    = <component>-type->length\n` +
      `              p_decimals  = <component>-type->decimals\n` +
      `            RECEIVING\n` +
      `              p_result    = component_rtti-type.\n` +
      `      ENDTRY.\n`,
  },
];

let failed = false;
for (const { file, find, replace } of patches) {
  const text = readFileSync(file, "utf8");
  if (text.includes(replace)) {
    console.log(`already patched: ${file}`);
    continue;
  }
  if (text.split(find).length !== 2) {
    console.error(`PATCH FAILED: ${file} - expected exactly one occurrence of:\n${find}`);
    failed = true;
    continue;
  }
  writeFileSync(file, text.replace(find, () => replace));
  console.log(`patched: ${file}`);
}
process.exit(failed ? 1 : 0);
