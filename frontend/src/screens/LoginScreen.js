import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../firebase/AuthContext";
import { C } from "../theme";

export default function LoginScreen() {
  const { signInWithGoogle, signInAnon } = useAuth();
  const [loading, setLoading] = useState(null);

  async function handleGoogle() {
    setLoading("google");
    try { await signInWithGoogle(); }
    catch (e) {
      Alert.alert("Sign in failed", "Could not sign in with Google. Make sure you have added your Google Web Client ID in AuthContext.js");
    } finally { setLoading(null); }
  }

  async function handleAnon() {
    setLoading("anon");
    try { await signInAnon(); }
    catch (e) { Alert.alert("Error", "Could not sign in anonymously."); }
    finally { setLoading(null); }
  }

  return (
    <LinearGradient colors={["#a855f7","#ec4899","#f97316"]} style={{flex:1}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <SafeAreaView style={{flex:1,justifyContent:"space-between",padding:28}}>

        {/* Top — branding */}
        <View style={{alignItems:"center",paddingTop:40}}>
          <View style={{width:80,height:80,borderRadius:24,backgroundColor:"rgba(255,255,255,0.2)",alignItems:"center",justifyContent:"center",marginBottom:20}}>
            <Text style={{fontSize:42}}>🚩</Text>
          </View>
          <Text style={{fontSize:38,fontWeight:"900",color:"#fff",letterSpacing:-1,textAlign:"center",lineHeight:42}}>LineGuard</Text>
          <Text style={{fontSize:16,color:"rgba(255,255,255,0.8)",fontWeight:"700",marginTop:8,textAlign:"center",lineHeight:24}}>
            Report line cutters silently.{"\n"}No shouting needed. 🛑
          </Text>
        </View>

        {/* Middle — floating emoji */}
        <View style={{alignItems:"center"}}>
          <Text style={{fontSize:60,opacity:0.4}}>😤</Text>
        </View>

        {/* Bottom — login buttons */}
        <View>
          <Text style={{fontSize:12,color:"rgba(255,255,255,0.6)",textAlign:"center",fontWeight:"700",marginBottom:16,lineHeight:18}}>
            Reports are anonymous — only your location{"\n"}is shared, never your identity.
          </Text>

          {/* Google */}
          <TouchableOpacity
            style={{backgroundColor:"#fff",borderRadius:50,padding:16,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12,shadowColor:"#000",shadowOpacity:0.2,shadowRadius:10}}
            onPress={handleGoogle} disabled={!!loading} activeOpacity={0.85}
          >
            {loading==="google" ? <ActivityIndicator color={C.purple}/> : (
              <>
                <Text style={{fontSize:20}}>🔵</Text>
                <Text style={{fontSize:16,fontWeight:"900",color:C.textDark}}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Anonymous */}
          <TouchableOpacity
            style={{borderRadius:50,padding:15,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,borderWidth:2,borderColor:"rgba(255,255,255,0.5)",backgroundColor:"rgba(255,255,255,0.15)"}}
            onPress={handleAnon} disabled={!!loading} activeOpacity={0.8}
          >
            {loading==="anon" ? <ActivityIndicator color="#fff"/> : (
              <>
                <Text style={{fontSize:20}}>👤</Text>
                <Text style={{fontSize:15,fontWeight:"800",color:"#fff"}}>Use anonymously</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={{fontSize:11,color:"rgba(255,255,255,0.5)",textAlign:"center",marginTop:16,fontWeight:"600",lineHeight:16}}>
            By continuing you agree that reports must be genuine.{"\n"}False reports can be appealed and removed.
          </Text>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}
