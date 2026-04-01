import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function TestInsertService() {
  const [isLoading, setIsLoading] = useState(false);

  const insertTestService = async () => {
    setIsLoading(true);
    try {
      // Hardcoded dummy data matching the services table schema
      const dummyData = {
        name: 'Teeth Whitening Promo',
        category: 'Dental',
        type: 'Promotion',
        description: 'A special teeth whitening promotion for a brighter smile.',
        base_price: 200.00,
        promo_price: 150.00,
        aracoins_perk: 15.00,
        branches: ['HQ', 'Kajang'], // JSONB column can accept arrays/objects
        duration_mins: 45
      };

      const { data, error } = await supabase
        .from('services')
        .insert([dummyData])
        .select();

      if (error) {
        console.error('Error inserting service:', error);
        alert(`Failed to insert service: ${error.message}`);
      } else {
        console.log('Successfully inserted service:', data);
        alert('Success! Dummy service inserted successfully.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred while inserting the service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-xl shadow-sm bg-white max-w-md mx-auto mt-8">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Supabase Insert Test</h3>
      <p className="text-sm text-gray-600 mb-6">
        Click the button below to insert a dummy record into the <code className="bg-gray-100 px-1 py-0.5 rounded">services</code> table.
      </p>
      <button
        onClick={insertTestService}
        disabled={isLoading}
        className="w-full px-4 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center"
      >
        {isLoading ? 'Inserting...' : 'Test Insert Service'}
      </button>
    </div>
  );
}
