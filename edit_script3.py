#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the new styles before the existing headerRow style
old_styles_section = '''  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },'''

new_styles_section = '''  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  filterDescriptionContainer: {
    backgroundColor: Colors.light,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterDescriptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
  },'''

if old_styles_section in content:
    content = content.replace(old_styles_section, new_styles_section)
    print("Styles addition successful")
else:
    print("Styles section not found for addition")

# Write the file back
with open('/app/frontend/app/(drawer)/my-charities.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Edit 3 completed")