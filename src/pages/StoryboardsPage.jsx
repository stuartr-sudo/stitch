import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StoryboardList from '../components/storyboard/StoryboardList';
import StoryboardEditor from '../components/storyboard/StoryboardEditor';

export default function StoryboardsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (id) {
    return (
      <StoryboardEditor
        storyboardId={id}
        onBack={() => navigate('/storyboards')}
      />
    );
  }

  return (
    <StoryboardList
      onOpenStoryboard={(storyboardId) => navigate(`/storyboards/${storyboardId}`)}
    />
  );
}
