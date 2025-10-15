import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Card, CardHeader, CardBody, LoadingSpinner } from '../../components/common';
import { healthcareAPI, apiHelpers } from '../../utils/api';

const MemberDetailsPage = () => {
  const { id } = useParams();
  
  const { data, isLoading, error } = useQuery(
    ['member', id],
    () => healthcareAPI.members.getById(id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-500 text-lg mb-4">
          Member not found
        </div>
      </div>
    );
  }

  const member = data.data.data.member;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Member Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Detailed information for {member.firstName} {member.lastName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Personal Information</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Member ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.memberId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.firstName} {member.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {apiHelpers.formatDate(member.dateOfBirth)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Gender</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.gender}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.phone || 'N/A'}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Plan Information</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Plan Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.planName || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Effective Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {apiHelpers.formatDate(member.effectiveDate)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{member.status}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default MemberDetailsPage;