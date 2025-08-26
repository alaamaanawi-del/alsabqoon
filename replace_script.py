#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-prayers/index.tsx', 'r') as f:
    content = f.read()

# Define the old string to replace
old_str = """  const router = useRouter();
  const { icons } = usePrayerIcons();"""

# Define the new string
new_str = """  const router = useRouter();
  const { icons } = usePrayerIcons();

  // Refresh function to reload scores and tasks
  const refreshData = async () => {
    const date = fmtYMD(selectedDate);
    const out: Record<string, { r1: number; r2: number }> = {};
    for (const p of PRAYERS) {
      const rec = await loadPrayerRecord(p.key, date);
      const sc = computeScore(rec);
      out[p.key] = { r1: sc.r1, r2: sc.r2 };
    }
    setScores(out);
    
    // Load tasks to check task icons
    const allTasks = await loadTasks();
    setTasks(allTasks);
  };

  // Refresh data when screen comes into focus (returning from record screen)
  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [selectedDate])
  );"""

# Perform the replacement
if old_str in content:
    new_content = content.replace(old_str, new_str)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(drawer)/my-prayers/index.tsx', 'w') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old string not found in file")
    print("Looking for:")
    print(repr(old_str))