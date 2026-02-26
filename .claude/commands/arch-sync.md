Re-read the actual source code and update ARCHITECTURE.md to match reality.

This command is for after refactors, file splits, or major changes when the architecture docs may have drifted from the code.

Do the following steps:

1. **Scan the project structure**: Use glob to find all source files (src/**/*.{js,jsx}, lib/**, etc.) and understand the current file tree.

2. **Read key files**: Read the main entry point, component files, physics/parser modules, and any new files added since ARCHITECTURE.md was last updated.

3. **Compare with ARCHITECTURE.md**: Read the current ARCHITECTURE.md and identify discrepancies:
   - Component hierarchy that no longer matches
   - Data flow diagrams that are outdated
   - State architecture that has changed
   - File map that's missing new files or lists deleted ones
   - PHY/parser tables that don't reflect current function signatures

4. **Update ARCHITECTURE.md**: Rewrite the outdated sections to match the actual code. Preserve the overall document structure and style. Don't remove sections that are still accurate.

5. **Cross-check other docs**: Briefly check if CLAUDE.md's file map or SCRATCHPAD.md's design decisions reference outdated structure. Flag or fix any inconsistencies.

6. **Print a diff summary**: List what changed in the architecture and why.
