import React, { createContext, ReactNode } from 'react';

// Define the shape of our app context
interface AppContextType {
  // Add any app-wide state or functions here as needed
  // For now, we'll keep it minimal to resolve the import error
  version: string;
}

// Create the context with default values
export const AppContext = createContext<AppContextType | undefined>(undefined);

// AppProvider component that wraps the app and provides context
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Define any app-wide state or logic here
  const contextValue: AppContextType = {
    // Add context values here as needed
    version: '1.0.0',
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};