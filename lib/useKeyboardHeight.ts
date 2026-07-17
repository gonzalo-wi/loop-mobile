import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Devuelve la altura actual del teclado (0 si está cerrado).
 * Sirve para agregar paddingBottom a listas scrolleables con inputs,
 * y que el último item pueda subir por encima del teclado en Android.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
