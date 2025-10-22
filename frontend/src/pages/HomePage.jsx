import React from 'react';
import SearchForm from '../components/SearchForm';
import Statistics from '../components/Statistics';
import SResearchDiscovery from '../components/ResearchDiscovery';

const HomePage = () => {
  return (
    <>
      <SearchForm />
      <Statistics />
      <SResearchDiscovery />
    </>
  );
};

export default HomePage;
