import React from 'react';
import { PoolSheetSync } from './PoolSheetSync';

export const PoolUploader: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <PoolSheetSync />
    </div>
  );
};
