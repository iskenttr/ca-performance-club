import React, { useState } from 'react';
import { AppFrame, TabItem } from '../../components/AppFrame';
import { useApp } from '../../context/AppContext';
import { TRAINER_ID } from '../../types/domain';
import { StudentDetailScreen } from './StudentDetailScreen';
import { StudentsScreen } from './StudentsScreen';
import { TrainerCalendarScreen } from './TrainerCalendarScreen';
import { TrainerHome } from './TrainerHome';
import { TrainerMessagesScreen } from './TrainerMessagesScreen';
import { TrainerProfileScreen } from './TrainerProfileScreen';

export type TrainerRoute = 'dashboard' | 'students' | 'studentDetail' | 'calendar' | 'messages' | 'profile';

export const TrainerApp = () => {
  const { data } = useApp();
  const [route, setRoute] = useState<TrainerRoute>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [calendarPrefill, setCalendarPrefill] = useState<string | undefined>();
  const [messagePrefill, setMessagePrefill] = useState<string | undefined>();
  const unread = data?.messages.filter((item) => item.senderId !== TRAINER_ID && !item.readAt).length ?? 0;
  const tabs: TabItem<TrainerRoute>[] = [
    { key: 'dashboard', label: 'Özet', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard' },
    { key: 'students', label: 'Öğrenciler', icon: 'account-group-outline', activeIcon: 'account-group' },
    { key: 'calendar', label: 'Takvim', icon: 'calendar-blank-outline', activeIcon: 'calendar' },
    { key: 'messages', label: 'Mesajlar', icon: 'message-text-outline', activeIcon: 'message-text', badge: unread },
    { key: 'profile', label: 'Profil', icon: 'account-circle-outline', activeIcon: 'account-circle' },
  ];

  const navigate = (next: TrainerRoute) => {
    if (next !== 'calendar') setCalendarPrefill(undefined);
    if (next !== 'messages') setMessagePrefill(undefined);
    setRoute(next);
  };

  const openStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setRoute('studentDetail');
  };

  const renderRoute = () => {
    switch (route) {
      case 'students': return <StudentsScreen onProfile={() => navigate('profile')} onStudent={openStudent} />;
      case 'studentDetail': return selectedStudentId ? (
        <StudentDetailScreen
          studentId={selectedStudentId}
          onBack={() => navigate('students')}
          onMessage={() => { setMessagePrefill(selectedStudentId); setRoute('messages'); }}
          onCalendar={() => { setCalendarPrefill(selectedStudentId); setRoute('calendar'); }}
        />
      ) : <StudentsScreen onProfile={() => navigate('profile')} onStudent={openStudent} />;
      case 'calendar': return <TrainerCalendarScreen onProfile={() => navigate('profile')} prefillStudentId={calendarPrefill} />;
      case 'messages': return <TrainerMessagesScreen onProfile={() => navigate('profile')} initialStudentId={messagePrefill} />;
      case 'profile': return <TrainerProfileScreen onBack={() => navigate('dashboard')} />;
      default: return <TrainerHome onNavigate={navigate} onStudent={openStudent} />;
    }
  };

  return (
    <AppFrame<TrainerRoute> activeTab={route} tabs={tabs} onTabPress={navigate}>
      {renderRoute()}
    </AppFrame>
  );
};

