import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { useI18n } from '../../../i18n';
import { createGuard } from '../../../lib/services/guard';
import { showCreatedToast, showErrorToast } from '../../../lib/toast-helpers';
import { AddressInput } from '@/components/ui/address-input';

interface CreateGuardProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  ssn: string;
  address: string;
  birth_date: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  ssn?: string;
  address?: string;
  birth_date?: string;
}

export function CreateGuard({ open, onClose, onCreated }: CreateGuardProps) {
  const { TEXT } = useI18n();
  
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    ssn: '',
    address: '',
    birth_date: ''
  });

  // Limpiar formulario cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      ssn: '',
      address: '',
      birth_date: ''
    });
    setErrors({});
    setGeneralError('');
    setLoading(false);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    // Validar campos requeridos
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
      hasErrors = true;
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
      hasErrors = true;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
      hasErrors = true;
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
      hasErrors = true;
    }

    if (!formData.ssn.trim()) {
      newErrors.ssn = 'SSN is required';
      hasErrors = true;
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      hasErrors = true;
    }

    if (!formData.birth_date.trim()) {
      newErrors.birth_date = 'Birth date is required';
      hasErrors = true;
    }

    setErrors(newErrors);

    if (hasErrors) {
      setGeneralError('Please fill in all required fields');
    } else {
      setGeneralError('');
    }

    return !hasErrors;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Limpiar error general si había
    if (generalError) {
      setGeneralError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      await createGuard(formData);
      showCreatedToast('Guard created successfully');
      onCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating guard:', error);
      showErrorToast('Failed to create guard. Please try again.');
      setGeneralError('Failed to create guard. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Textos usando i18n con fallbacks
  const createText = (TEXT as any)?.actions?.create ?? 'Create';
  const cancelText = (TEXT as any)?.actions?.cancel ?? 'Cancel';
  const savingText = (TEXT as any)?.actions?.saving ?? 'Creating...';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Guard</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* First Name */}
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className={errors.first_name ? 'border-red-500 focus:border-red-500' : ''}
              placeholder="Enter first name"
            />
            {errors.first_name && (
              <p className="text-sm text-red-600 mt-1">{errors.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className={errors.last_name ? 'border-red-500 focus:border-red-500' : ''}
              placeholder="Enter last name"
            />
            {errors.last_name && (
              <p className="text-sm text-red-600 mt-1">{errors.last_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-red-500 focus:border-red-500' : ''}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={errors.phone ? 'border-red-500 focus:border-red-500' : ''}
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
            )}
          </div>

          {/* SSN */}
          <div>
            <Label htmlFor="ssn">SSN *</Label>
            <Input
              id="ssn"
              type="text"
              value={formData.ssn}
              onChange={(e) => handleInputChange('ssn', e.target.value)}
              className={errors.ssn ? 'border-red-500 focus:border-red-500' : ''}
              placeholder="Enter SSN"
              maxLength={11}
            />
            {errors.ssn && (
              <p className="text-sm text-red-600 mt-1">{errors.ssn}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Address *</Label>
            <AddressInput
              value={formData.address}
              onChange={(value: string) => handleInputChange('address', value)}
              placeholder="Enter address"
              className={errors.address ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.address && (
              <p className="text-sm text-red-600 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Birth Date */}
          <div>
            <Label htmlFor="birth_date">Birth Date *</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleInputChange('birth_date', e.target.value)}
              className={errors.birth_date ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.birth_date && (
              <p className="text-sm text-red-600 mt-1">{errors.birth_date}</p>
            )}
          </div>

          {/* Error general */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{generalError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end items-center gap-2 pt-4">
            <Button variant="secondary" onClick={() => { resetForm(); onClose(); }} disabled={loading}>
              {cancelText}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? savingText : createText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateGuard;
