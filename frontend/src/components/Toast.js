import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Animated, Text, StyleSheet } from "react-native";

let _show = null;
export const showToast = (msg) => _show && _show(msg);

const Toast = forwardRef((_, ref) => {
  const [msg, setMsg] = useState("");
  const op = useRef(new Animated.Value(0)).current;
  const show = (m) => {
    setMsg(m);
    Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };
  useEffect(() => { _show = show; }, []);
  useImperativeHandle(ref, () => ({ show }));
  return (
    <Animated.View style={[s.wrap, { opacity: op }]} pointerEvents="none">
      <Text style={s.txt}>{msg}</Text>
    </Animated.View>
  );
});
export default Toast;
const s = StyleSheet.create({
  wrap: { position: "absolute", bottom: 90, alignSelf: "center", backgroundColor: "#1a1a2e", borderRadius: 50, paddingHorizontal: 20, paddingVertical: 12, zIndex: 999 },
  txt:  { color: "#fff", fontSize: 14, fontWeight: "700" },
});
