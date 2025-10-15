import React from 'react';
import { Card, CardBody } from '../../components/common';

const EmployerDetailsPage = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Employer Details</h2>
      <Card>
        <CardBody>
          <p>Employer details will be displayed here.</p>
        </CardBody>
      </Card>
    </div>
  );
};

export default EmployerDetailsPage;