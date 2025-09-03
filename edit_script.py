#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old text to replace
old_text = '''        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.header}>
            {selectedLanguage === 'ar' ? 'صدقاتي' : 
             selectedLanguage === 'en' ? 'My Charities' : 
             'Mis Caridades'}
          </Text>
          <TouchableOpacity 
            onPress={() => setShowCalendar(!showCalendar)}
            style={styles.calBtn}
          >
            <Text style={styles.calTxt}>
              {showCalendar 
                ? (selectedLanguage === 'ar' ? 'إغلاق' : selectedLanguage === 'en' ? 'Close' : 'Cerrar')
                : (selectedLanguage === 'ar' ? 'التقويم' : selectedLanguage === 'en' ? 'Calendar' : 'Calendario')
              }
            </Text>
          </TouchableOpacity>
        </View>'''

# Define the new text
new_text = '''        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft} />
          <Text style={styles.header}>صدقاتي</Text>
          <TouchableOpacity style={styles.headerRight} onPress={() => setShowCalendar(!showCalendar)}>
            <Ionicons name="calendar" size={24} color={Colors.deepGreen} />
          </TouchableOpacity>
        </View>'''

# Perform the replacement
if old_text in content:
    content = content.replace(old_text, new_text)
    print("Header replacement successful")
else:
    print("Header text not found for replacement")

# Write the file back
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Edit completed")