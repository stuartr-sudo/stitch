import React from 'react';
import { useNavigate } from 'react-router-dom';
import StoryboardList from '../components/storyboard/StoryboardList';

export default function StoryboardsPage() {
  const navigate = useNavigate();

  return (
    <StoryboardList
      onOpenStoryboard={(storyboardId) => navigate(`/storyboards/${storyboardId}`)}
    />
  );
}
