import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/constants/colors';
import { API } from '../../src/services/api';

function TabIcon({ name, focused, badge }: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={s.iconWrap}>
      <Ionicons name={name} size={24} color={focused ? C.accent : C.text3} />
      {badge != null && badge > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

// Post tab button (centre FAB)
function ComposeTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.fab} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="add" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const poll = () => API.getUnreadCount().then(setUnread).catch(() => {});
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.text3,
        tabBarShowLabel: true,
        tabBarLabelStyle: s.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bits',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="interviews"
        options={{
          title: 'Interviews',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: 'Post',
          tabBarIcon: ({ focused }) => <TabIcon name="add-circle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} badge={unread} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 4,
    height: 84,
    paddingBottom: 20,
  },
  label: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: C.accent, borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  fab: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
