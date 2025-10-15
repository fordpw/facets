import React from 'react';
import { Card, CardHeader, CardBody } from '../../components/common';

const PlansPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Insurance Plans</h2>
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Health Insurance Plans</h3>
        </CardHeader>
        <CardBody>
          <p>Insurance plans management functionality will be available here.</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default PlansPage;