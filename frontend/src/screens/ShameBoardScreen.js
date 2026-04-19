import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Share, SafeAreaView, Modal, TextInput, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, T } from "../theme";
import { listenToShameBoard, castVote, fileAppeal } from "../firebase/helpers";
import { useAuth } from "../firebase/AuthContext";
import { showToast } from "../components/Toast";
import Toast from "../components/Toast";

export default function ShameBoardScreen() {
  const { user } = useAuth();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [myVotes, setMyVotes]   = useState({});
  const [appealModal, setAppealModal] = useState(null); // shameId
  const [appealText, setAppealText]   = useState("");
  const [appealing, setAppealing]     = useState(false);

  useEffect(() => {
    const unsub = listenToShameBoard(d => { setItems(d); setLoading(false); });
    return () => unsub();
  }, []);

  async function handleVote(id, v) {
    if (!user) return;
    if (myVotes[id]) { showToast("Already voted!"); return; }
    setMyVotes(x => ({ ...x, [id]: v }));
    try { await castVote(id, v, user.uid); showToast(v==="yes"?"👎 Voted Guilty!":"✓ Voted Not guilty"); }
    catch { showToast("Error voting."); }
  }

  async function handleAppeal() {
    if (!appealText.trim()) { Alert.alert("Reason needed","Please explain why this should be removed."); return; }
    if (!user) { Alert.alert("Sign in needed","Please sign in to file an appeal."); return; }
    setAppealing(true);
    try {
      await fileAppeal(appealModal, user.uid, appealText.trim());
      setAppealModal(null);
      setAppealText("");
      showToast("⚖️ Appeal filed! Staff will review within 48 hours.");
    } catch { showToast("Error filing appeal."); }
    finally { setAppealing(false); }
  }

  async function handleShare(item) {
    try { await Share.share({ message:`Queue cutter reported at ${item.locationName}. Check LineGuard for details.` }); }
    catch {}
  }

  function minConfirmsWarning(item) {
    const confirms = item.confirmCount || 0;
    if (confirms < 10) return `Needs ${10 - confirms} more community confirmations`;
    return null;
  }

  if (loading) return (
    <LinearGradient colors={["#a855f7","#ec4899"]} style={{flex:1,alignItems:"center",justifyContent:"center"}}>
      <ActivityIndicator size="large" color="#fff"/>
      <Text style={{color:"rgba(255,255,255,0.8)",marginTop:12,fontWeight:"800",fontSize:14}}>Loading...</Text>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.offWhite}}>
      <Toast />

      {/* Appeal Modal */}
      <Modal visible={!!appealModal} transparent animationType="slide">
        <View style={{flex:1,backgroundColor:"rgba(0,0,0,0.5)",justifyContent:"flex-end"}}>
          <View style={{backgroundColor:"#fff",borderRadius:24,padding:20,margin:12,paddingBottom:36}}>
            <Text style={{fontSize:20,fontWeight:"900",color:C.textDark,marginBottom:4}}>⚖️ File an appeal</Text>
            <Text style={{fontSize:13,color:C.textLight,fontWeight:"700",marginBottom:16,lineHeight:20}}>
              Explain why this report should be removed. Staff will review within 48 hours. False appeals may result in a ban.
            </Text>
            <TextInput
              style={{backgroundColor:C.offWhite,borderRadius:16,padding:14,fontSize:14,color:C.textDark,fontWeight:"700",borderWidth:1.5,borderColor:C.border,marginBottom:14,minHeight:80,textAlignVertical:"top"}}
              placeholder="e.g. I was actually in the queue, there was a misunderstanding..."
              placeholderTextColor={C.textLight}
              value={appealText}
              onChangeText={setAppealText}
              multiline maxLength={300}
            />
            <TouchableOpacity style={{overflow:"hidden",borderRadius:50,marginBottom:10}} onPress={handleAppeal} disabled={appealing}>
              <LinearGradient colors={["#a855f7","#ec4899"]} style={{padding:15,alignItems:"center",borderRadius:50}} start={{x:0,y:0}} end={{x:1,y:0}}>
                {appealing ? <ActivityIndicator color="#fff"/> : <Text style={{color:"#fff",fontSize:15,fontWeight:"900"}}>Submit appeal</Text>}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={{padding:14,alignItems:"center"}} onPress={()=>{setAppealModal(null);setAppealText("");}}>
              <Text style={{fontSize:14,color:C.textLight,fontWeight:"700"}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LinearGradient colors={["#a855f7","#ec4899"]} style={{paddingHorizontal:20,paddingBottom:14,paddingTop:14}} start={{x:0,y:0}} end={{x:1,y:0}}>
        <Text style={{fontSize:24,fontWeight:"900",color:"#fff",letterSpacing:-0.5}}>Hall of shame 🏴</Text>
        <Text style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:"700",marginTop:2}}>Anonymous reports · 10+ confirmations needed</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{padding:16,paddingBottom:100}}>
        {items.length === 0 && (
          <View style={{alignItems:"center",padding:40,marginTop:20}}>
            <Text style={{fontSize:52}}>🏳️</Text>
            <Text style={{fontSize:16,color:C.textPurple,fontWeight:"800",textAlign:"center",marginTop:12}}>No verified reports yet.{"\n"}Be the first to report!</Text>
          </View>
        )}

        {items.map(item => {
          const tot   = (item.votes?.yes||0)+(item.votes?.no||0)||1;
          const pct   = Math.round(((item.votes?.yes||0)/tot)*100);
          const voted = myVotes[item.id];
          const confirms = item.confirmCount || 0;
          const warning  = minConfirmsWarning(item);

          return (
            <View key={item.id} style={{backgroundColor:"#fff",borderRadius:24,overflow:"hidden",marginBottom:16,borderWidth:1.5,borderColor:confirms>=10?C.purple:C.border}}>

              {/* Media or placeholder */}
              {item.mediaURL ? (
                item.mediaType === "video" ? (
                  <View style={{height:200,backgroundColor:"#1a1a2e",alignItems:"center",justifyContent:"center",gap:8}}>
                    <Text style={{fontSize:44}}>🎥</Text>
                    <Text style={{color:"rgba(255,255,255,0.5)",fontSize:13,fontWeight:"700"}}>Video evidence (tap to play)</Text>
                  </View>
                ) : (
                  <Image source={{uri:item.mediaURL}} style={{width:"100%",height:200,resizeMode:"cover"}}/>
                )
              ) : (
                <LinearGradient colors={["#1a1a2e","#2d1b69"]} style={{height:130,alignItems:"center",justifyContent:"center",gap:6}}>
                  <Text style={{fontSize:36}}>🚩</Text>
                  <Text style={{color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:"700"}}>Reported — no photo/video</Text>
                </LinearGradient>
              )}

              <View style={{padding:14}}>
                {/* Unverified warning */}
                {warning && (
                  <View style={{backgroundColor:C.amberLight,borderRadius:12,padding:8,marginBottom:10,flexDirection:"row",alignItems:"center",gap:6}}>
                    <Text style={{fontSize:14}}>⏳</Text>
                    <Text style={{fontSize:12,color:C.amber,fontWeight:"800"}}>{warning}</Text>
                  </View>
                )}

                {confirms >= 10 && (
                  <LinearGradient colors={["#a855f7","#ec4899"]} style={{borderRadius:50,paddingHorizontal:12,paddingVertical:4,alignSelf:"flex-start",marginBottom:8}} start={{x:0,y:0}} end={{x:1,y:0}}>
                    <Text style={{fontSize:11,fontWeight:"900",color:"#fff"}}>🛡️ Verified · Permanent record</Text>
                  </LinearGradient>
                )}

                <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <Text style={{fontSize:18,fontWeight:"900",color:C.textDark}}>Queue cutter 😡</Text>
                  {confirms >= 10
                    ? <LinearGradient colors={["#a855f7","#ec4899"]} style={{borderRadius:50,paddingHorizontal:10,paddingVertical:3}} start={{x:0,y:0}} end={{x:1,y:0}}><Text style={{fontSize:10,fontWeight:"900",color:"#fff"}}>Guilty 🚩</Text></LinearGradient>
                    : <View style={{backgroundColor:C.amberLight,borderRadius:50,paddingHorizontal:10,paddingVertical:3}}><Text style={{fontSize:10,fontWeight:"900",color:C.amber}}>Pending ⏳</Text></View>
                  }
                </View>

                <Text style={{fontSize:13,color:C.textLight,fontWeight:"700",marginTop:2}}>📍 {item.locationName}</Text>
                {item.locationAddress && item.locationAddress !== item.locationName && (
                  <Text style={{fontSize:11,color:C.textPurple,fontWeight:"700",marginTop:1}}>{item.locationAddress}</Text>
                )}
                <Text style={{fontSize:11,color:C.textPurple,fontWeight:"700",marginTop:2,marginBottom:10}}>
                  🕐 {item.postedAt?.toDate ? item.postedAt.toDate().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "Just now"}
                  {"  ·  "}✅ {confirms} confirmations
                </Text>

                {/* Verdict bar */}
                <View style={{height:4,backgroundColor:C.border,borderRadius:50,overflow:"hidden",marginBottom:5}}>
                  <LinearGradient colors={["#a855f7","#ec4899"]} style={{width:`${pct}%`,height:"100%",borderRadius:50}} start={{x:0,y:0}} end={{x:1,y:0}}/>
                </View>
                <View style={{flexDirection:"row",justifyContent:"space-between",marginBottom:12}}>
                  <Text style={{fontSize:10,color:C.textPurple,fontWeight:"800"}}>👎 {item.votes?.yes||0} say guilty</Text>
                  <Text style={{fontSize:10,color:C.textPurple,fontWeight:"800"}}>✓ {item.votes?.no||0} say not guilty</Text>
                </View>

                {/* Actions */}
                <View style={{flexDirection:"row",gap:8,flexWrap:"wrap"}}>
                  <TouchableOpacity
                    style={{flex:1,minWidth:100,paddingVertical:10,borderRadius:50,alignItems:"center",borderWidth:2,borderColor:voted==="yes"?C.purple:C.border,overflow:"hidden"}}
                    onPress={()=>handleVote(item.id,"yes")} disabled={!!voted}
                  >
                    {voted==="yes" && <LinearGradient colors={["#a855f7","#ec4899"]} style={{position:"absolute",top:0,left:0,right:0,bottom:0}} start={{x:0,y:0}} end={{x:1,y:0}}/>}
                    <Text style={{fontSize:12,fontWeight:"900",color:voted==="yes"?"#fff":C.textDark,zIndex:1}}>👎 Guilty ({item.votes?.yes||0})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{flex:1,minWidth:80,paddingVertical:10,borderRadius:50,alignItems:"center",borderWidth:2,backgroundColor:voted==="no"?C.greenLight:"transparent",borderColor:voted==="no"?C.green:C.border}}
                    onPress={()=>handleVote(item.id,"no")} disabled={!!voted}
                  >
                    <Text style={{fontSize:12,fontWeight:"900",color:voted==="no"?C.green:C.textDark}}>✓ Not ({item.votes?.no||0})</Text>
                  </TouchableOpacity>
                </View>

                {/* Share + Appeal */}
                <View style={{flexDirection:"row",gap:8,marginTop:8}}>
                  <TouchableOpacity style={{flex:1,paddingVertical:9,borderRadius:50,alignItems:"center",borderWidth:1.5,borderColor:C.border,flexDirection:"row",justifyContent:"center",gap:4}} onPress={()=>handleShare(item)}>
                    <Text style={{fontSize:13}}>↗️</Text>
                    <Text style={{fontSize:12,fontWeight:"800",color:C.textLight}}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{flex:1,paddingVertical:9,borderRadius:50,alignItems:"center",borderWidth:1.5,borderColor:"#fca5a5",flexDirection:"row",justifyContent:"center",gap:4}}
                    onPress={()=>{setAppealModal(item.id); setAppealText("");}}
                  >
                    <Text style={{fontSize:13}}>⚖️</Text>
                    <Text style={{fontSize:12,fontWeight:"800",color:C.red}}>Appeal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
