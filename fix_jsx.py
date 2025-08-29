#!/usr/bin/env python3

# Read the file
with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the problematic section and fix it
# The issue is after the calendar days grid, we need to close the calendar container properly

# Find the line with renderCalendarDays() and add the missing closing tags
old_section = """                {/* Calendar Days */}
                <View style={styles.daysGrid}>
                  {renderCalendarDays()}
                </View>
              </View>
            </ScrollView>



      <ScrollView"""

new_section = """                {/* Calendar Days */}
                <View style={styles.daysGrid}>
                  {renderCalendarDays()}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView"""

# Perform the replacement
if old_section in content:
    new_content = content.replace(old_section, new_section)
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully fixed JSX structure!")
else:
    print("Could not find the problematic section")
    print("Looking for:")
    print(repr(old_section))