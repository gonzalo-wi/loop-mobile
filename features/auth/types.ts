export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  type: string;
  id: string;
  name: string;
  username: string;
  role: string;
};
