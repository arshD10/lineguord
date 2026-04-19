import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, SafeAreaView, TextInput
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { C, T } from "../theme";
import { submitReport } from "../firebase/helpers";
import { useAuth } from "../firebase/AuthContext";
import { useLocation } from "../hooks/useLocation";
import { showToast } from "../components/Toast";
import Toast from "../components/Toast";

const STEP = { HOME:0, LOC:1, MEDIA:2, REVIEW:3, SENT:4, TOKEN:5 };

export default function ReportScreen() {
  const { user } = useAuth();
  const { address, loading: locLoading, error: locError, getLocation } = useLocation();

  const [step, setStep]           = useState(STEP.HOME);
  const [locationName, setLocName] = useState("");
  const [manualMode, setManual]   = useState(false);
  const [mediaUri, setMediaUri]   = useState(null);
  const [mediaType, setMType]     = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const displayLoc = manualMode ? locationName : (address?.name || "");
  const displayAddr = manualMode ? locationName : (address?.full || "");

  // ── Camera ──────────────────────────────────────────────────
  async function openCamera(type) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera permission needed", "Please allow camera access:\nSettings → Apps → LineGuard → Permissions → Camera");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: type === "video" ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      videoMaxDuration: 30,
      allowsEditing: false,
    });
    if (!r.canceled && r.assets?.[0]) {
      setMediaUri(r.assets[0].uri);
      setMType(type);
      showToast(type === "video" ? "🎥 Video recorded!" : "📷 Photo taken!");
    }
  }

  // ── Gallery ─────────────────────────────────────────────────
  async function openGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access in Settings.");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      setMediaUri(a.uri);
      setMType(a.type === "video" ? "video" : "photo");
      showToast("🖼️ File selected!");
    }
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit() {
    const locName = manualMode ? locationName : (address?.name || "Unknown location");
    if (!locName.trim()) { Alert.alert("Location needed", "Please enter or detect your location."); return; }
    setSubmitting(true);
    try {
      await submitReport({
        locationName: locName,
        locationAddress: manualMode ? locationName : (address?.full || locName),
        lat:  manualMode ? null : address?.lat,
        lng:  manualMode ? null : address?.lng,
        mediaUri,
        mediaType,
        userId: user?.uid || "anon",
      });
      setStep(STEP.SENT);
      showToast("🚩 Report submitted!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to submit. Check internet connection and Firebase setup.");
    } finally { setSubmitting(false); }
  }

  function reset() { setStep(STEP.HOME); setLocName(""); setManual(false); setMediaUri(null); setMType(null); }

  // ── HOME ─────────────────────────────────────────────────────
  if (step === STEP.HOME) return (
    <LinearGradient colors={["#a855f7","#ec4899","#f97316"]} style={{flex:1}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <SafeAreaView style={{flex:1}}><Toast />
        <ScrollView contentContainerStyle={{padding:22,paddingBottom:100}}>
          <Text style={{fontSize:11,fontWeight:"900",color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:2,marginTop:8,marginBottom:4}}>LineGuard</Text>
          <Text style={{fontSize:32,fontWeight:"900",color:"#fff",letterSpacing:-1,lineHeight:38,marginBottom:6}}>Stop line{"\n"}cutters. 🛑</Text>
          <Text style={{fontSize:13,color:"rgba(255,255,255,0.75)",fontWeight:"700",marginBottom:22}}>Works anywhere in India & worldwide.</Text>

          <WBtn white title="🚩 Flag a line cutter" onPress={()=>setStep(STEP.LOC)} color={C.purple}/>
          <OBtn title="🎫 Check my token" onPress={()=>setStep(STEP.TOKEN)}/>

          <View style={{marginTop:8}}>
            <MenuRow icon="📋" title="Hall of shame" sub="Guilty line cutters · permanent posts" emoji="💜"/>
            <MenuRow icon="💬" title="Community" sub="Talk about queue culture across India" emoji="🔥"/>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

  // ── LOCATION ─────────────────────────────────────────────────
  if (step === STEP.LOC) return (
    <LinearGradient colors={["#a855f7","#ec4899"]} style={{flex:1}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <SafeAreaView style={{flex:1}}><Toast />
        <ScrollView contentContainerStyle={{padding:22,paddingBottom:100}}>
          <Steps n={1}/>
          <Text style={{fontSize:24,fontWeight:"900",color:"#fff",marginBottom:4}}>Where are you? 📍</Text>
          <Text style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:"700",marginBottom:18}}>Works anywhere in the world</Text>

          {/* GPS detect button */}
          <TouchableOpacity
            style={{backgroundColor:"#fff",borderRadius:20,padding:16,flexDirection:"row",alignItems:"center",gap:12,marginBottom:12,opacity:locLoading?0.7:1}}
            onPress={()=>{setManual(false); getLocation();}} disabled={locLoading} activeOpacity={0.85}
          >
            {locLoading
              ? <ActivityIndicator color={C.purple}/>
              : <Text style={{fontSize:26}}>📡</Text>
            }
            <View style={{flex:1}}>
              <Text style={{fontSize:15,fontWeight:"900",color:C.textDark}}>{locLoading?"Detecting location...":"Detect my location"}</Text>
              <Text style={{fontSize:12,color:C.textLight,fontWeight:"700",marginTop:1}}>Uses GPS · works anywhere</Text>
            </View>
          </TouchableOpacity>

          {/* Show detected address */}
          {address && !manualMode && (
            <View style={{backgroundColor:"rgba(255,255,255,0.95)",borderRadius:16,padding:14,marginBottom:12,borderWidth:2,borderColor:"rgba(255,255,255,0.5)"}}>
              <Text style={{fontSize:12,color:C.purple,fontWeight:"900",marginBottom:4}}>📍 Detected location</Text>
              <Text style={{fontSize:15,fontWeight:"800",color:C.textDark}}>{address.name}</Text>
              <Text style={{fontSize:12,color:C.textLight,fontWeight:"700",marginTop:2}}>{address.full}</Text>
            </View>
          )}

          {locError && (
            <View style={{backgroundColor:"rgba(255,255,255,0.2)",borderRadius:12,padding:10,marginBottom:10}}>
              <Text style={{fontSize:12,color:"#fff",fontWeight:"700"}}>⚠️ {locError}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={{flexDirection:"row",alignItems:"center",gap:10,marginVertical:12}}>
            <View style={{flex:1,height:1,backgroundColor:"rgba(255,255,255,0.3)"}}/>
            <Text style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:"700"}}>or type manually</Text>
            <View style={{flex:1,height:1,backgroundColor:"rgba(255,255,255,0.3)"}}/>
          </View>

          {/* Manual input */}
          <TextInput
            style={{backgroundColor:"#fff",borderRadius:16,padding:14,fontSize:14,color:C.textDark,fontWeight:"700",marginBottom:16}}
            placeholder="e.g. Andheri RTO, Mumbai / JFK Airport, NY"
            placeholderTextColor={C.textLight}
            value={locationName}
            onChangeText={(t)=>{setLocName(t); setManual(true);}}
          />

          <WBtn white
            title={address||locationName.trim() ? "Next →" : "Next →"}
            onPress={()=>{
              if(!manualMode && !address) { Alert.alert("Location needed","Please detect location or type it."); return; }
              if(manualMode && !locationName.trim()) { Alert.alert("Location needed","Please type your location."); return; }
              setStep(STEP.MEDIA);
            }}
            color={C.purple}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

  // ── MEDIA ─────────────────────────────────────────────────────
  if (step === STEP.MEDIA) return (
    <LinearGradient colors={["#7c3aed","#a855f7","#ec4899"]} style={{flex:1}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <SafeAreaView style={{flex:1}}><Toast />
        <ScrollView contentContainerStyle={{padding:22,paddingBottom:100}}>
          <Steps n={2}/>
          <Text style={{fontSize:24,fontWeight:"900",color:"#fff",marginBottom:4}}>Capture evidence 📸</Text>
          <Text style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:"700",marginBottom:16}}>Photo or video · stays anonymous</Text>

          {!mediaUri ? (
            <>
              <View style={{flexDirection:"row",gap:10,marginBottom:10}}>
                <CamBtn icon="📷" title="Take photo" sub="Opens camera" onPress={()=>openCamera("photo")}/>
                <CamBtn icon="🎥" title="Record video" sub="Max 30 sec" onPress={()=>openCamera("video")}/>
              </View>
              <TouchableOpacity
                style={{borderWidth:2.5,borderStyle:"dashed",borderColor:"rgba(255,255,255,0.4)",borderRadius:20,padding:24,alignItems:"center",marginBottom:12,backgroundColor:"rgba(255,255,255,0.1)"}}
                onPress={openGallery} activeOpacity={0.7}
              >
                <Text style={{fontSize:30,marginBottom:6}}>🖼️</Text>
                <Text style={{fontSize:15,fontWeight:"900",color:"#fff"}}>Upload from gallery</Text>
                <Text style={{fontSize:12,color:"rgba(255,255,255,0.6)",fontWeight:"700",marginTop:2}}>Choose existing photo/video</Text>
              </TouchableOpacity>
              <OBtn title="Skip — alert only (no evidence)" onPress={()=>setStep(STEP.REVIEW)}/>
            </>
          ) : (
            <>
              <View style={{borderRadius:20,overflow:"hidden",marginBottom:12,height:240}}>
                <Image source={{uri:mediaUri}} style={{width:"100%",height:240,resizeMode:"cover"}}/>
                <View style={{position:"absolute",top:12,left:12,backgroundColor:"rgba(126,58,237,0.85)",borderRadius:50,paddingHorizontal:12,paddingVertical:5}}>
                  <Text style={{color:"#fff",fontSize:12,fontWeight:"900"}}>{mediaType==="video"?"🎥 Video":"📷 Photo"}</Text>
                </View>
              </View>
              <WBtn white title="Next →" onPress={()=>setStep(STEP.REVIEW)} color={C.purple}/>
              <OBtn title="Retake 🔄" onPress={()=>{setMediaUri(null);setMType(null);}}/>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

  // ── REVIEW ────────────────────────────────────────────────────
  if (step === STEP.REVIEW) return (
    <LinearGradient colors={["#ec4899","#f97316"]} style={{flex:1}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <SafeAreaView style={{flex:1}}><Toast />
        <ScrollView contentContainerStyle={{padding:22,paddingBottom:100}}>
          <Steps n={3}/>
          <Text style={{fontSize:24,fontWeight:"900",color:"#fff",marginBottom:4}}>Confirm & send 🚨</Text>
          <Text style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:"700",marginBottom:16}}>Review before submitting</Text>

          <View style={{backgroundColor:"#fff",borderRadius:20,padding:16,marginBottom:14,borderWidth:1.5,borderColor:C.border}}>
            <RR l="📍 Location" v={manualMode?locationName:(address?.name||"Detected")}/>
            <RR l="🌍 Address"  v={manualMode?locationName:(address?.full||"")} small/>
            <RR l="📸 Evidence" v={mediaUri?(mediaType==="video"?"Video 🎥":"Photo 📷"):"None (alert only)"} vc={mediaUri?C.purple:C.textLight}/>
            <RR l="🔒 Identity" v="100% anonymous" vc={C.green}/>
            <RR l="📤 Sent to"  v="Staff + community board" vc={C.pink} last/>
          </View>

          <View style={{backgroundColor:"rgba(255,255,255,0.2)",borderRadius:16,padding:14,marginBottom:16,borderWidth:1.5,borderColor:"rgba(255,255,255,0.4)"}}>
            <Text style={{fontSize:13,color:"#fff",lineHeight:20,fontWeight:"700"}}>
              ⚠️ Reports need <Text style={{fontWeight:"900"}}>10+ community confirmations</Text> before anyone appears on the shame board.{"\n\n"}Anyone can <Text style={{fontWeight:"900"}}>appeal</Text> their listing for removal.
            </Text>
          </View>

          <TouchableOpacity
            style={{backgroundColor:"#fff",borderRadius:50,padding:16,alignItems:"center",marginBottom:10}}
            onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color={C.pink}/> : <Text style={{fontSize:16,fontWeight:"900",color:C.pink}}>🚨 Submit report</Text>}
          </TouchableOpacity>
          <OBtn title="Cancel" onPress={reset}/>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

  // ── SENT ──────────────────────────────────────────────────────
  if (step === STEP.SENT) return (
    <SafeAreaView style={{flex:1,backgroundColor:C.offWhite}}>
      <ScrollView contentContainerStyle={{padding:22,paddingBottom:100}}>
        <LinearGradient colors={["#7c3aed","#db2777","#f97316"]} style={{borderRadius:24,padding:24,alignItems:"center",marginBottom:16,marginTop:10}} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={{fontSize:52,marginBottom:10}}>🎉</Text>
          <Text style={{fontSize:22,fontWeight:"900",color:"#fff",marginBottom:8}}>Alert sent!</Text>
          <Text style={{fontSize:14,color:"rgba(255,255,255,0.85)",textAlign:"center",lineHeight:22,fontWeight:"700"}}>
            Your anonymous report has been filed.{"\n"}Staff have been notified. 🚩
          </Text>
        </LinearGradient>
        <View style={T.infoBox}>
          <Text style={{fontSize:13,color:C.purple,lineHeight:26,fontWeight:"700"}}>
            {"✅ Staff reviews your report\n🗳️ 10+ confirmations needed for shame board\n🏆 Guilty = posted anonymously\n⚖️ Anyone can appeal for removal\n❤️ Community upvotes push it higher"}
          </Text>
        </View>
        <TouchableOpacity onPress={reset} activeOpacity={0.85}>
          <LinearGradient colors={["#a855f7","#ec4899"]} style={{borderRadius:50,padding:16,alignItems:"center"}} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Text style={{color:"#fff",fontSize:16,fontWeight:"900"}}>🏠 Back to home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── TOKEN ─────────────────────────────────────────────────────
  if (step === STEP.TOKEN) return (
    <SafeAreaView style={{flex:1,backgroundColor:C.offWhite}}>
      <ScrollView contentContainerStyle={{padding:22,paddingBottom:100}}>
        <LinearGradient colors={["#a855f7","#ec4899","#f97316"]} style={{borderRadius:28,padding:28,alignItems:"center",marginBottom:16,marginTop:10}} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={{fontSize:80,fontWeight:"900",color:"#fff",lineHeight:84,letterSpacing:-4}}>--</Text>
          <Text style={{fontSize:15,fontWeight:"800",color:"rgba(255,255,255,0.7)",marginTop:6,textAlign:"center"}}>Token tracking coming soon</Text>
          <Text style={{fontSize:13,color:"rgba(255,255,255,0.5)",fontWeight:"700",marginTop:4,textAlign:"center"}}>Needs integration with your office's token system</Text>
        </LinearGradient>
        <View style={{flexDirection:"row",gap:10,marginBottom:16}}>
          <SBox n="?" l="ahead 👥" bg="#fdf4ff" c={C.purple}/>
          <SBox n="?" l="min ⏱️"   bg="#fff7ed" c={C.orange}/>
          <SBox n="?" l="serving 🔔" bg="#f0fdf4" c={C.green}/>
        </View>
        <TouchableOpacity onPress={()=>setStep(STEP.LOC)} activeOpacity={0.85}>
          <LinearGradient colors={["#a855f7","#ec4899"]} style={{borderRadius:50,padding:16,alignItems:"center"}} start={{x:0,y:0}} end={{x:1,y:0}}>
            <Text style={{color:"#fff",fontSize:16,fontWeight:"900"}}>🚩 Report a cutter instead</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  return null;
}

// ── Reusable components ──────────────────────────────────────
const WBtn = ({title,onPress,color}) => (
  <TouchableOpacity style={{backgroundColor:"#fff",borderRadius:50,padding:16,alignItems:"center",marginBottom:10,shadowColor:"#000",shadowOpacity:0.15,shadowRadius:8}} onPress={onPress} activeOpacity={0.85}>
    <Text style={{fontSize:16,fontWeight:"900",color:color||C.purple}}>{title}</Text>
  </TouchableOpacity>
);
const OBtn = ({title,onPress}) => (
  <TouchableOpacity style={{borderRadius:50,padding:14,alignItems:"center",marginBottom:10,borderWidth:2,borderColor:"rgba(255,255,255,0.5)",backgroundColor:"rgba(255,255,255,0.15)"}} onPress={onPress} activeOpacity={0.8}>
    <Text style={{fontSize:15,fontWeight:"800",color:"#fff"}}>{title}</Text>
  </TouchableOpacity>
);
const MenuRow = ({icon,title,sub,emoji}) => (
  <View style={{flexDirection:"row",alignItems:"center",gap:14,padding:16,borderRadius:20,backgroundColor:"rgba(255,255,255,0.15)",marginBottom:10,borderWidth:1,borderColor:"rgba(255,255,255,0.25)"}}>
    <View style={{width:48,height:48,borderRadius:18,backgroundColor:"rgba(255,255,255,0.2)",alignItems:"center",justifyContent:"center"}}>
      <Text style={{fontSize:24}}>{icon}</Text>
    </View>
    <View style={{flex:1}}>
      <Text style={{fontSize:15,fontWeight:"900",color:"#fff"}}>{title}</Text>
      <Text style={{fontSize:12,color:"rgba(255,255,255,0.65)",fontWeight:"700",marginTop:1}}>{sub}</Text>
    </View>
    <Text style={{fontSize:20}}>{emoji}</Text>
  </View>
);
const CamBtn = ({icon,title,sub,onPress}) => (
  <TouchableOpacity style={{flex:1,padding:20,borderRadius:20,backgroundColor:"rgba(255,255,255,0.15)",alignItems:"center",gap:8,borderWidth:1.5,borderColor:"rgba(255,255,255,0.4)"}} onPress={onPress} activeOpacity={0.7}>
    <Text style={{fontSize:32}}>{icon}</Text>
    <Text style={{fontSize:14,fontWeight:"900",color:"#fff"}}>{title}</Text>
    <Text style={{fontSize:11,color:"rgba(255,255,255,0.6)",fontWeight:"700"}}>{sub}</Text>
  </TouchableOpacity>
);
const Steps = ({n}) => (
  <View style={T.stepsRow}>
    {[1,2,3,4].map(i=>(
      <View key={i} style={[T.step, i<n&&T.stepDone, i===n&&T.stepAct]}/>
    ))}
  </View>
);
const RR = ({l,v,vc,last,small}) => (
  <View style={{flexDirection:"row",justifyContent:"space-between",paddingVertical:small?6:9,borderBottomWidth:last?0:1,borderColor:"#faf5ff",flexWrap:"wrap",gap:4}}>
    <Text style={{fontSize:13,color:C.textLight,fontWeight:"700"}}>{l}</Text>
    <Text style={{fontSize:small?12:14,fontWeight:small?"700":"900",color:vc||C.textDark,flex:1,textAlign:"right"}}>{v}</Text>
  </View>
);
const SBox = ({n,l,bg,c}) => (
  <View style={{flex:1,backgroundColor:bg,borderRadius:18,padding:14,alignItems:"center"}}>
    <Text style={{fontSize:26,fontWeight:"900",color:c}}>{n}</Text>
    <Text style={{fontSize:11,color:c,marginTop:2,fontWeight:"800",opacity:0.8}}>{l}</Text>
  </View>
);
