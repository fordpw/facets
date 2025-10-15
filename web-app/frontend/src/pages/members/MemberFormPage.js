import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { toast } from 'react-toastify';
import { Card, CardHeader, CardBody, Button, Input, Select } from '../../components/common';
import { healthcareAPI } from '../../utils/api';

const MemberFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    memberId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    ssn: '',
    email: '',
    phone: '',
    address: {
      street1: '',
      street2: '',
      city: '',
      state: '',
      zipCode: '',
    },
    effectiveDate: '',
    planId: '',
    employerId: '',
    relationshipCode: 'SELF',
  });

  const [loading, setLoading] = useState(false);

  // Fetch member data if editing
  const { data: memberData } = useQuery(
    ['member', id],
    () => healthcareAPI.members.getById(id),
    { enabled: isEdit }
  );

  // Fetch plans and employers for dropdowns
  const { data: plansData } = useQuery('plans', () => healthcareAPI.plans.getAll({ limit: 100 }));
  const { data: employersData } = useQuery('employers', () => healthcareAPI.employers.getAll({ limit: 100 }));

  const plans = plansData?.data?.data?.plans || [];
  const employers = employersData?.data?.data?.employers || [];

  useEffect(() => {
    if (memberData && isEdit) {
      const member = memberData.data.data.member;
      setFormData({
        memberId: member.memberId || member.member_id,
        firstName: member.firstName || member.first_name,
        lastName: member.lastName || member.last_name,
        dateOfBirth: member.dateOfBirth || member.date_of_birth,
        gender: member.gender,
        ssn: member.ssn || '',
        email: member.email || '',
        phone: member.phone || '',
        address: member.address || {
          street1: '',
          street2: '',
          city: '',
          state: '',
          zipCode: '',
        },
        effectiveDate: member.effectiveDate || member.effective_date,
        planId: member.planId || member.plan_id || '',
        employerId: member.employerId || member.employer_id || '',
        relationshipCode: member.relationshipCode || member.relationship_code || 'SELF',
      });
    }
  }, [memberData, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await healthcareAPI.members.update(id, formData);
        toast.success('Member updated successfully');
      } else {
        await healthcareAPI.members.create(formData);
        toast.success('Member created successfully');
      }
      navigate('/members');
    } catch (error) {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} member`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Member' : 'Add New Member'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isEdit ? 'Update member information' : 'Enter member details to create a new healthcare plan member'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Personal Information</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Member ID"
                required
                value={formData.memberId}
                onChange={(e) => handleInputChange('memberId', e.target.value)}
                placeholder="MBR001234"
              />
              <Input
                label="First Name"
                required
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="John"
              />
              <Input
                label="Last Name"
                required
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Doe"
              />
              <Input
                label="Date of Birth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              />
              <Select
                label="Gender"
                required
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                options={[
                  { value: 'M', label: 'Male' },
                  { value: 'F', label: 'Female' },
                  { value: 'U', label: 'Unknown' },
                ]}
              />
              <Input
                label="SSN"
                value={formData.ssn}
                onChange={(e) => handleInputChange('ssn', e.target.value)}
                placeholder="123-45-6789"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john.doe@example.com"
              />
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="555-123-4567"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Address Information</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Street Address 1"
                value={formData.address.street1}
                onChange={(e) => handleInputChange('address.street1', e.target.value)}
                placeholder="123 Main St"
                className="sm:col-span-2"
              />
              <Input
                label="Street Address 2"
                value={formData.address.street2}
                onChange={(e) => handleInputChange('address.street2', e.target.value)}
                placeholder="Apt 4B"
                className="sm:col-span-2"
              />
              <Input
                label="City"
                value={formData.address.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                placeholder="Anytown"
              />
              <Input
                label="State"
                value={formData.address.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                placeholder="NY"
              />
              <Input
                label="ZIP Code"
                value={formData.address.zipCode}
                onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                placeholder="12345"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Plan Information</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Input
                label="Effective Date"
                type="date"
                required
                value={formData.effectiveDate}
                onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
              />
              <Select
                label="Insurance Plan"
                required
                value={formData.planId}
                onChange={(e) => handleInputChange('planId', e.target.value)}
                options={plans.map(plan => ({
                  value: plan.id,
                  label: `${plan.planName} (${plan.planCode})`
                }))}
              />
              <Select
                label="Employer"
                value={formData.employerId}
                onChange={(e) => handleInputChange('employerId', e.target.value)}
                options={employers.map(employer => ({
                  value: employer.id,
                  label: employer.companyName
                }))}
              />
              <Select
                label="Relationship"
                required
                value={formData.relationshipCode}
                onChange={(e) => handleInputChange('relationshipCode', e.target.value)}
                options={[
                  { value: 'SELF', label: 'Self' },
                  { value: 'SPOUSE', label: 'Spouse' },
                  { value: 'CHILD', label: 'Child' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/members')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {isEdit ? 'Update Member' : 'Create Member'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MemberFormPage;