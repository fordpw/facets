import React from 'react';
import { Card, CardBody } from '../../components/common';

const ClaimDetailsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Claim Details</h2>
      <Card>
        <CardBody>
          <p>Claim details will be displayed here.</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default ClaimDetailsPage;