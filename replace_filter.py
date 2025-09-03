#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old text to replace
old_text = """        {/* Filter Description Display */}
        <View style={styles.filterDescriptionContainer}>
          {selectedFilter === 'today' && (
            <Text style={styles.filterDescriptionText}>
              {new Date().toLocaleDateString('ar', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'Asia/Riyadh'
              })}
            </Text>
          )}
          {selectedFilter === 'week' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال أسبوع
            </Text>
          )}
          {selectedFilter === 'month' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال شهر
            </Text>
          )}
          {selectedFilter === 'select' && (
            <Text style={styles.filterDescriptionText}>
              النطاق المحدد
            </Text>
          )}
        </View>"""

# Define the new text
new_text = """        {/* Filter Description Display */}
        <View style={styles.filterDescriptionContainer}>
          {selectedFilter === 'week' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال أسبوع
            </Text>
          )}
          {selectedFilter === 'month' && (
            <Text style={styles.filterDescriptionText}>
              أدائك خلال شهر
            </Text>
          )}
          {selectedFilter === 'select' && (
            <Text style={styles.filterDescriptionText}>
              النطاق المحدد
            </Text>
          )}
        </View>"""

# Perform the replacement
if old_text in content:
    new_content = content.replace(old_text, new_text)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(drawer)/my-charities.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old text not found in file")
    print("Searching for partial matches...")
    
    # Let's check if we can find the comment
    if "Filter Description Display" in content:
        print("Found 'Filter Description Display' comment")
        # Find the section and print it
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "Filter Description Display" in line:
                print(f"Found at line {i+1}")
                # Print surrounding lines
                start = max(0, i-2)
                end = min(len(lines), i+25)
                for j in range(start, end):
                    print(f"{j+1:3d}: {lines[j]}")
                break
    else:
        print("'Filter Description Display' comment not found")