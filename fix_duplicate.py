#!/usr/bin/env python3

import re

# Read the file
with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the first Date Picker Modal (the incorrectly placed one)
# This is the one that appears around line 481
first_modal_start = content.find("      {/* Date Picker Modal for Select Filter */}")
if first_modal_start != -1:
    # Find the end of this modal - look for the closing braces
    # The modal ends with "      )}\n          </View>\n        )}\n      </View>"
    search_from = first_modal_start
    modal_end_pattern = "      )}\n          </View>\n        )}\n      </View>"
    first_modal_end = content.find(modal_end_pattern, search_from)
    
    if first_modal_end != -1:
        # Remove the first modal completely
        first_modal_end += len(modal_end_pattern)
        new_content = content[:first_modal_start] + content[first_modal_end:]
        
        # Write the updated content back to the file
        with open('/app/frontend/app/(drawer)/my-azkar.tsx', 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("Successfully removed the duplicate Date Picker Modal!")
        print(f"Removed content from position {first_modal_start} to {first_modal_end}")
    else:
        print("Could not find the end of the first modal")
else:
    print("Could not find the first Date Picker Modal")