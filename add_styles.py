#!/usr/bin/env python3

# Read the file
with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of the StyleSheet (before the closing });)
styles_end = content.rfind('});')

if styles_end != -1:
    # Add the date picker styles before the closing });
    date_picker_styles = """  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerModal: {
    backgroundColor: Colors.light,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 300,
    width: '90%',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerButton: {
    backgroundColor: Colors.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: Colors.darkGray,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.accent,
  },
  cancelButtonText: {
    color: Colors.light,
  },
"""
    
    # Insert the styles before the closing });
    new_content = content[:styles_end] + date_picker_styles + content[styles_end:]
    
    # Write the updated content back to the file
    with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully added date picker styles!")
else:
    print("Could not find the end of the StyleSheet")