import React from 'react';
import { useParams } from 'react-router-dom';
import CarouselList from '@/components/carousel/CarouselList';
import CarouselEditor from '@/components/carousel/CarouselEditor';

export default function CarouselPage() {
  const { id } = useParams();
  return id ? <CarouselEditor carouselId={id} /> : <CarouselList />;
}
