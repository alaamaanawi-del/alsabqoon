#!/usr/bin/env python3
"""
Debug script to understand Quran search issues
"""

import requests
import json

BASE_URL = "https://muslim-tracker-2.preview.emergentagent.com/api"

def debug_search(query, description):
    print(f"\n🔍 Testing: {description} - Query: '{query}'")
    try:
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": query})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"   Results: {len(results)}")
            
            if len(results) > 0:
                print(f"   First result: {results[0]}")
                # Check if Al-Fatiha 1:1 is in results for بسم
                if query == "بسم":
                    for result in results:
                        if result.get("surahNumber") == 1 and result.get("ayah") == 1:
                            print(f"   ✅ Found Al-Fatiha 1:1: {result.get('textAr')}")
                            return
                    print(f"   ❌ Al-Fatiha 1:1 not found in results")
            else:
                print("   No results found")
        else:
            print(f"   Error: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   Error: {str(e)}")

# Test various queries
debug_search("بسم", "Bismillah search")
debug_search("بِسْمِ", "Bismillah with diacritics")
debug_search("الله", "Allah search")
debug_search("الله@#$%", "Allah with special characters")

# Test the exact text from the JSON
debug_search("بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", "Full Bismillah")