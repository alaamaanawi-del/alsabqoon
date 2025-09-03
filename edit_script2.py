#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Language Selector section
old_language_selector = '''
        {/* Language Selector */}
        {renderLanguageSelector()}'''

new_language_selector = ''

if old_language_selector in content:
    content = content.replace(old_language_selector, new_language_selector)
    print("Language Selector removal successful")
else:
    print("Language Selector text not found for removal")

# Add Filter Description Display after filter buttons
# First, let's find where the filter buttons are called and add the description after it
old_filter_section = '''        {renderFilterButtons()}'''

new_filter_section = '''        {renderFilterButtons()}

        {/* Filter Description Display */}
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
        </View>'''

if old_filter_section in content:
    content = content.replace(old_filter_section, new_filter_section)
    print("Filter Description Display addition successful")
else:
    print("Filter section text not found for addition")

# Write the file back
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Edit 2 completed")