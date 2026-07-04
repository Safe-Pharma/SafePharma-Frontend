export interface UserFormValue {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: string;
  branch: string;
  status: 'Active' | 'Inactive';
}