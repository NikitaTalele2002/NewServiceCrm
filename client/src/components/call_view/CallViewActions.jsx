import React from 'react';
import Button from '../common/Button';

const CallViewActions = ({ onActionLog, onViewDownload, onFaultsAndParts }) => {
  return (
    <div className="flex flex-wrap gap-4">
      <Button onClick={onActionLog} variant="primary" className="bg-blue-600 hover:bg-blue-700">
        Action Log
      </Button>
      <Button onClick={onFaultsAndParts} variant="success" className="bg-green-600 hover:bg-green-700">
        Faults & Parts
      </Button>
      <Button variant="warning" className="bg-yellow-600 hover:bg-yellow-700">
        Invoice Note
      </Button>
      <Button onClick={onViewDownload} variant="secondary" className="bg-purple-600 hover:bg-purple-700">
        View & Download
      </Button>
      <Button variant="danger" className="bg-red-600 hover:bg-red-700">
        Follow-Up
      </Button>
    </div>
  );
};

export default CallViewActions;