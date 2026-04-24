import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { COLORS } from './src/theme';
import { isSetupDone, markSetupDone } from './src/storage/store';
import WelcomeModal from './src/components/WelcomeModal';

import ProfileScreen from './src/screens/ProfileScreen';
import PlanRoundScreen from './src/screens/PlanRoundScreen';
import GamePlanScreen from './src/screens/GamePlanScreen';
import PostRoundScreen from './src/screens/PostRoundScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AddCourseScreen from './src/screens/AddCourseScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, focused }) {
  const icons = { 'My Profile': '\uD83C\uDFCC\uFE0F', 'Plan': '\uD83D\uDCCB', 'History': '\uD83D\uDCCA' };
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || '\u2022'}
    </Text>
  );
}

function PlanStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="PlanRound" component={PlanRoundScreen} options={{ title: 'Plan a Round', headerShown: false }} />
      <Stack.Screen name="AddCourse" component={AddCourseScreen} options={{ title: 'Add Course', headerShown: false }} />
      <Stack.Screen name="GamePlan" component={GamePlanScreen} options={{ title: 'Game Plan', headerShown: false }} />
      <Stack.Screen name="PostRound" component={PostRoundScreen} options={{ title: 'Post-Round Review', headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    isSetupDone().then(done => {
      if (!done) setShowWelcome(true);
    });
  }, []);

  const handleDismissWelcome = () => {
    markSetupDone();
    setShowWelcome(false);
  };

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <WelcomeModal visible={showWelcome} onDismiss={handleDismissWelcome} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          unmountOnBlur: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textLight,
          tabBarStyle: { paddingBottom: 4, height: 56 },
          tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        })}
      >
        <Tab.Screen name="My Profile" component={ProfileScreen} />
        <Tab.Screen name="Plan" component={PlanStack} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
