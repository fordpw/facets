import React from 'react';
import { Card, CardBody } from '../../components/common';

const PlanDetailsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Plan Details</h2>
      <Card>
        <CardBody>
          <p>Plan details will be displayed here.</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default PlanDetailsPage;