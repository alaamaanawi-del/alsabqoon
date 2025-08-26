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

  // Dynamic color based on progress - Updated to user requirements
  const getProgressColor = () => {
    if (percentage >= 61) return '#4CAF50'; // Green for 61-100%
    if (percentage >= 31) return '#FF9800'; // Orange for 31-60%
    return '#FF4444'; // Red for 0-30%
  };

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <View style={styles.trackBar} />
        {!isEmpty && (
          <View 
            style={[
              styles.fillBar, 
              { 
                width: `${percentage}%`,
                backgroundColor: getProgressColor()
              }
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