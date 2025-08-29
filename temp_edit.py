#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old text to replace
old_text = """        {/* Progress Chart */}
        {renderProgressChart()}
      </ScrollView>
    </SafeAreaView>"""

# Define the new text
new_text = """        {/* Progress Chart */}
        {renderProgressChart()}
      </ScrollView>

      {/* Date Picker Modal for Select Filter */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.datePickerTitle}>اختر نطاق التاريخ</Text>
            
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setShowDatePicker(false);
                setSelectedFilter('today');
              }}
            >
              <Text style={styles.datePickerButtonText}>اليوم</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                setSelectedDate(weekAgo);
                setShowDatePicker(false);
                setSelectedFilter('week');
              }}
            >
              <Text style={styles.datePickerButtonText}>آخر 7 أيام</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => {
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                setSelectedDate(monthAgo);
                setShowDatePicker(false);
                setSelectedFilter('month');
              }}
            >
              <Text style={styles.datePickerButtonText}>آخر 30 يوم</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.datePickerButton, styles.cancelButton]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[styles.datePickerButtonText, styles.cancelButtonText]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>"""

# Perform the replacement
if old_text in content:
    new_content = content.replace(old_text, new_text)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Replacement successful!")
else:
    print("Old text not found in file")
    print("Looking for:")
    print(repr(old_text))
    print("\nActual content around that area:")
    # Find the Progress Chart comment and show context
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'Progress Chart' in line:
            start = max(0, i-3)
            end = min(len(lines), i+8)
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}")
            break