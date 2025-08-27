#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('/app/test_result.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Use the exact string from the file
old_line = """user_problem_statement: "Build ALSABQON – Prayer Tracker & Qur'an Study with Arabic default, drawer nav, My Prayers, and MVP Qur'an search (AR default, optional AR+EN/AR+ES).\""""
new_line = """user_problem_statement: "Add comprehensive 'My Azkar' feature to ALSABQON app with calendar functionality, progress tracking, zikr recording, and detailed analytics\""""

if old_line in content:
    new_content = content.replace(old_line, new_line)
    with open('/app/test_result.md', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Replacement successful')
else:
    print('Old line not found')
    # Debug: show what we're looking for vs what exists
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'user_problem_statement:' in line and 'Build ALSABQON' in line:
            print(f'Found line {i+1}:')
            print(f'  Actual: {repr(line)}')
            print(f'  Target: {repr(old_line)}')
            print(f'  Match: {line == old_line}')