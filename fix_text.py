#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('/app/test_result.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the exact line from the file
with open('/app/test_result.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    old_line = lines[104].strip()  # Line 105 (0-indexed), remove newline

new_line = 'user_problem_statement: "Add comprehensive \'My Azkar\' feature to ALSABQON app with calendar functionality, progress tracking, zikr recording, and detailed analytics"'

print(f"Looking for: {repr(old_line)}")
print(f"Replacing with: {repr(new_line)}")

if old_line in content:
    new_content = content.replace(old_line, new_line)
    with open('/app/test_result.md', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replacement successful')
else:
    print('Old line not found in content')