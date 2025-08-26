#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-prayers/record.tsx', 'r') as f:
    content = f.read()

# Define the old function
old_function = """  const selectWholeSurah = async () => {
    const base = rangeStart || results[0];
    if (!base) return;
    try {
      const mod = Platform.OS === 'web' ? await import("../../../src/db/quran.web") : await import("../../../src/db/quran.native");
      const range = await mod.getSurahRange(base.surahNumber);
      if (range) {
        setRangeStart({ ...base, ayah: range.fromAyah });
        setRangeEnd({ ...base, ayah: range.toAyah });
      }
    } catch {}
  };"""

# Define the new function
new_function = """  const selectWholeSurah = async () => {
    setShowSurahSelector(true);
  };"""

# Perform the replacement
new_content = content.replace(old_function, new_function)

# Write the file back
with open('/app/frontend/app/(drawer)/my-prayers/record.tsx', 'w') as f:
    f.write(new_content)

print("Replacement completed successfully")