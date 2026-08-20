import React, { useState } from 'react';
import { AppFrame, TabItem } from '../../components/AppFrame';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types/domain';
import { ProgramScreen } from './ProgramScreen';
import { ProgressScreen } from './ProgressScreen';
import { StudentCalendarScreen } from './StudentCalendarScreen';
import { StudentHome } from './StudentHome';
import { StudentMessagesScreen } from './StudentMessagesScreen';
import { StudentProfileScreen } from './StudentProfileScreen';

export type StudentRoute = 'home' | 'program' | 'progress' | 'calendar' | 'messages' | 'profile';

export const StudentApp = () => {
  const { data, user } = useApp();
  const student = user as Student;
  const [route, setRoute] = useState<StudentRoute>('home');
  const unread = data?.messages.filter((item) => item.studentId === student.id && item.senderId !== student.id && !item.readAt).length ?? 0;
  const tabs: TabItem<StudentRoute>[] = [
    { key: 'home', label: 'Ana sayfa', icon: 'home-outline', activeIcon: 'home' },
    { key: 'program', label: 'Program', icon: 'dumbbell' },
    { key: 'progress', label: 'Gelişim', icon: 'chart-line' },
    { key: 'calendar', label: 'Takvim', icon: 'calendar-blank-outline', activeIcon: 'calendar' },
    { key: 'messages', label: 'Mesajlar', icon: 'message-text-outline', activeIcon: 'message-text', badge: unread },
  ];

  const renderRoute = () => {
    switch (route) {
      case 'program': return <ProgramScreen onProfile={() => setRoute('profile')} />;
      case 'progress': return <ProgressScreen onProfile={() => setRoute('profile')} />;
      case 'calendar': return <StudentCalendarScreen onProfile={() => setRoute('profile')} />;
      case 'messages': return <StudentMessagesScreen onProfile={() => setRoute('profile')} />;
      case 'profile': return <StudentProfileScreen onBack={() => setRoute('home')} />;
      default: return <StudentHome onNavigate={setRoute} />;
    }
  };

  return (
    <AppFrame<StudentRoute> activeTab={route} tabs={tabs} onTabPress={setRoute}>
      {renderRoute()}
    </AppFrame>
  );
};

