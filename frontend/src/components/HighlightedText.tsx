import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  style?: any;
  highlightStyle?: any;
}

export default function HighlightedText({ 
  text, 
  searchTerm, 
  style, 
  highlightStyle 
}: HighlightedTextProps) {
  if (!searchTerm.trim()) {
    return <Text style={style}>{text}</Text>;
  }

  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        // Check if this part matches the search term (case insensitive)
        const isHighlight = regex.test(part);
        return (
          <Text 
            key={index}
            style={isHighlight ? [styles.highlight, highlightStyle] : undefined}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: '#4A9EFF',
    color: '#FFFFFF',
    fontWeight: '700',
    paddingHorizontal: 2,
    borderRadius: 3,
  },
});