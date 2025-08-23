import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

interface TaskProgressBarProps {
  score: number; // 0-100
  showPercentage?: boolean;
}

export default function TaskProgressBar({ score, showPercentage = true }: TaskProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, score));
  const isEmpty = percentage === 0;

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={styles.trackBar} />
        {!isEmpty && (
          <View 
            style={[
              styles.fillBar, 
              { width: `${percentage}%` }
            ]} 
          />
        )}
      </View>
      {showPercentage && !isEmpty && (
        <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 6,
    position: 'relative',
    marginRight: 8,
  },
  trackBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#374544', // Dark gray for empty portion
    borderRadius: 3,
  },
  fillBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#FF4444', // Red for completed portion
    borderRadius: 3,
  },
  percentageText: {
    color: Colors.light,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
});