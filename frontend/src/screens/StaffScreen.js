import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, T } from "../theme";
import { listenToReports, markGuilty, dismissReport, listenToAppeals, resolveAppeal } from "../firebase/helpers";
import { useAuth } from "../firebase/AuthContext";
import { showToast } from "../components/Toast";
import Toast from "../components/Toast";

const TABS = ["Reports","Appeals"];

export default function StaffScreen() {
  const { user, staff, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("Reports");
  const [reports, setReports]   = useState([]);
  const [appeals, setAppeals]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(null);

  useEffect(() => {
    const u1 = listenToReports(d => { setReports(d); setLoading(false); });
    const u2 = listenToAppeals(d => setAppeals(d));
    return () => { u1(); u2(); };
  }, []);

  if (!staff) return (
    <LinearGradient colors={["#4c1d95","#7c3aed"]} style={{flex:1,alignItems:"center",justifyContent:"center",padding:28}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <Text style={{fontSize:52,marginBottom:16}}>🔒</Text>
      <Text style={{fontSize:22,fontWeight:"900",color:"#fff",textAlign:"center",marginBottom:8}}>Staff only</Text>
      <Text style={{fontSize:14,color:"rgba(255,255,255,0.7)",textAlign:"center",fontWeight:"700",lineHeight:22,marginBottom:28}}>
        This section is for verified staff only.{"\n"}Contact your admin to get staff access.
      </Text>
      <TouchableOpacity style={{backgroundColor:"rgba(255,255,255,0.2)",borderRadius:50,padding:14,paddingHorizontal:28}} onPress={logout}>
        <Text style={{color:"#fff",fontWeight:"800",fontSize:14}}>Sign out</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const open     = reports.filter(r => r.status==="pending");
  const resolved = reports.filter(r => r.status!=="pending");
  const guiltyC  = reports.filter(r => r.status==="guilty").length;

  async function handleGuilty(id) {
    Alert.alert("Mark as guilty?","This will post the report permanently on the shame board.",
      [{text:"Cancel",style:"cancel"},{text:"Yes, mark guilty",style:"destructive",onPress:async()=>{
        setActing(id);
        try { await markGuilty(id); showToast("🚩 Marked guilty! Posted to shame board."); }
        catch { showToast("Error. Check Firebase."); }
        finally { setActing(null); }
      }}]
    );
  }

  async function handleDismiss(id) {
    setActing(id);
    try { await dismissReport(id); showToast("Dismissed."); }
    catch { showToast("Error."); }
    finally { setActing(null); }
  }

  async function handleAppeal(appealId, shameId, action) {
    setActing(appealId);
    try {
      await resolveAppeal(appealId, shameId, action);
      showToast(action==="approved" ? "✅ Appeal approved — post removed!" : "❌ Appeal rejected.");
    } catch { showToast("Error handling appeal."); }
    finally { setActing(null); }
  }

  if (loading) return (
    <LinearGradient colors={["#4c1d95","#7c3aed"]} style={{flex:1,alignItems:"center",justifyContent:"center"}}>
      <ActivityIndicator size="large" color="#fff"/>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.offWhite}}>
      <Toast />
      <LinearGradient colors={["#4c1d95","#7c3aed"]} style={{paddingHorizontal:20,paddingBottom:14,paddingTop:14}} start={{x:0,y:0}} end={{x:1,y:0}}>
        <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}>
          <View>
            <Text style={{fontSize:24,fontWeight:"900",color:"#fff",letterSpacing:-0.5}}>Staff 👮</Text>
            <Text style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:"700",marginTop:2}}>Signed in as {user?.displayName||"Staff"}</Text>
          </View>
          <TouchableOpacity style={{backgroundColor:"rgba(255,255,255,0.2)",borderRadius:50,padding:8,paddingHorizontal:14}} onPress={logout}>
            <Text style={{color:"#fff",fontWeight:"800",fontSize:12}}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{padding:16,paddingBottom:100}}>
        {/* Stats */}
        <View style={{flexDirection:"row",gap:8,marginBottom:16}}>
          <StatCard num={open.length}     lbl="Open 🔔"         gradient={["#a855f7","#ec4899"]}/>
          <StatCard num={resolved.length} lbl="Resolved ✅"     gradient={["#10b981","#06b6d4"]}/>
          <StatCard num={appeals.length}  lbl="Appeals ⚖️"      gradient={["#f97316","#ec4899"]}/>
        </View>

        {/* Tab switcher */}
        <View style={{flexDirection:"row",backgroundColor:"#fff",borderRadius:16,padding:4,marginBottom:16,borderWidth:1.5,borderColor:C.border}}>
          {TABS.map(tab=>(
            <TouchableOpacity key={tab} style={{flex:1,overflow:"hidden",borderRadius:12}} onPress={()=>setActiveTab(tab)}>
              {activeTab===tab
                ? <LinearGradient colors={["#a855f7","#ec4899"]} style={{padding:10,alignItems:"center",borderRadius:12}} start={{x:0,y:0}} end={{x:1,y:0}}>
                    <Text style={{fontSize:13,fontWeight:"900",color:"#fff"}}>{tab} {tab==="Appeals"&&appeals.length>0?`(${appeals.length})`:""}</Text>
                  </LinearGradient>
                : <View style={{padding:10,alignItems:"center"}}>
                    <Text style={{fontSize:13,fontWeight:"800",color:C.textLight}}>{tab}</Text>
                  </View>
              }
            </TouchableOpacity>
          ))}
        </View>

        {/* REPORTS TAB */}
        {activeTab==="Reports" && (
          <>
            <Text style={T.label}>Open reports ({open.length})</Text>
            {open.length===0 && <View style={{padding:24,alignItems:"center"}}><Text style={{fontSize:32}}>✅</Text><Text style={{fontSize:14,color:C.textPurple,fontWeight:"800",marginTop:8}}>All clear!</Text></View>}
            {open.map(r=>(
              <View key={r.id} style={{backgroundColor:"#fff",borderRadius:20,overflow:"hidden",marginBottom:10,borderWidth:2,borderColor:C.purple}}>
                {r.mediaURL && r.mediaType!=="video" && <Image source={{uri:r.mediaURL}} style={{width:"100%",height:180,resizeMode:"cover"}}/>}
                {r.mediaURL && r.mediaType==="video" && (
                  <View style={{height:100,backgroundColor:"#1a1a2e",alignItems:"center",justifyContent:"center",gap:4}}>
                    <Text style={{fontSize:28}}>🎥</Text>
                    <Text style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:"700"}}>Video evidence attached</Text>
                  </View>
                )}
                <View style={{padding:14}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <Text style={{fontSize:14,fontWeight:"900",color:C.purple,flex:1,marginRight:8}}>📍 {r.locationName||r.location}</Text>
                    <LinearGradient colors={["#a855f7","#ec4899"]} style={{borderRadius:50,paddingHorizontal:10,paddingVertical:3}} start={{x:0,y:0}} end={{x:1,y:0}}>
                      <Text style={{fontSize:10,fontWeight:"900",color:"#fff"}}>🔔 NEW</Text>
                    </LinearGradient>
                  </View>
                  {r.locationAddress && <Text style={{fontSize:12,color:C.textLight,fontWeight:"700",marginBottom:4}}>{r.locationAddress}</Text>}
                  {r.hasMedia && <Text style={{fontSize:12,color:C.textPurple,fontWeight:"700",marginBottom:6}}>{r.mediaType==="video"?"🎥 Video":"📷 Photo"} evidence</Text>}
                  <Text style={{fontSize:12,color:C.textMid,fontWeight:"700",marginBottom:4}}>✅ {r.confirmCount||0} community confirmations</Text>
                  <Text style={{fontSize:12,color:C.textLight,fontWeight:"700",marginBottom:12}}>
                    {r.createdAt?.toDate?r.createdAt.toDate().toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"Just now"}
                  </Text>
                  <View style={{flexDirection:"row",gap:8}}>
                    <TouchableOpacity style={{flex:1,overflow:"hidden",borderRadius:50}} onPress={()=>handleGuilty(r.id)} disabled={acting===r.id}>
                      <LinearGradient colors={["#7c3aed","#db2777"]} style={{padding:12,alignItems:"center",borderRadius:50}} start={{x:0,y:0}} end={{x:1,y:0}}>
                        {acting===r.id ? <ActivityIndicator size="small" color="#fff"/>
                          : <Text style={{fontSize:13,fontWeight:"900",color:"#fff"}}>🚩 Guilty → shame board</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={{paddingHorizontal:18,borderRadius:50,padding:12,borderWidth:2,borderColor:C.border}} onPress={()=>handleDismiss(r.id)} disabled={acting===r.id}>
                      <Text style={{fontSize:13,fontWeight:"800",color:C.textLight}}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {resolved.length>0 && (
              <>
                <Text style={[T.label,{marginTop:16}]}>Resolved ({resolved.length})</Text>
                {resolved.map(r=>(
                  <View key={r.id} style={{backgroundColor:"#fff",borderRadius:16,padding:14,marginBottom:8,borderWidth:1.5,borderColor:C.border}}>
                    <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <Text style={{fontSize:14,fontWeight:"800",color:C.textDark,flex:1}}>📍 {r.locationName||r.location}</Text>
                      <View style={{backgroundColor:r.status==="guilty"?C.offWhite:C.greenLight,borderRadius:50,paddingHorizontal:10,paddingVertical:3}}>
                        <Text style={{fontSize:10,fontWeight:"900",color:r.status==="guilty"?C.purple:C.green}}>{r.status==="guilty"?"Guilty 🚩":"Dismissed"}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* APPEALS TAB */}
        {activeTab==="Appeals" && (
          <>
            <Text style={T.label}>Pending appeals ({appeals.length})</Text>
            {appeals.length===0 && <View style={{padding:24,alignItems:"center"}}><Text style={{fontSize:32}}>⚖️</Text><Text style={{fontSize:14,color:C.textPurple,fontWeight:"800",marginTop:8}}>No pending appeals</Text></View>}
            {appeals.map(a=>(
              <View key={a.id} style={{backgroundColor:"#fff",borderRadius:20,padding:14,marginBottom:10,borderWidth:2,borderColor:"#fca5a5"}}>
                <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:8}}>
                  <Text style={{fontSize:14,fontWeight:"900",color:C.red}}>⚖️ Appeal filed</Text>
                  <View style={{backgroundColor:"#FEF3C7",borderRadius:50,paddingHorizontal:8,paddingVertical:2,marginLeft:"auto"}}>
                    <Text style={{fontSize:10,fontWeight:"900",color:C.amber}}>PENDING</Text>
                  </View>
                </View>
                <Text style={{fontSize:13,color:C.textMid,fontWeight:"700",lineHeight:20,marginBottom:4}}>
                  <Text style={{fontWeight:"900",color:C.textDark}}>Reason: </Text>{a.reason}
                </Text>
                <Text style={{fontSize:11,color:C.textPurple,fontWeight:"700",marginBottom:12}}>
                  Filed by: {a.userId?.slice(0,8)||"user"}... · {a.createdAt?.toDate?a.createdAt.toDate().toLocaleDateString("en-IN"):"Recently"}
                </Text>
                <View style={{flexDirection:"row",gap:8}}>
                  <TouchableOpacity
                    style={{flex:1,overflow:"hidden",borderRadius:50}}
                    onPress={()=>handleAppeal(a.id,a.shameId,"approved")} disabled={acting===a.id}
                  >
                    <LinearGradient colors={["#10b981","#06b6d4"]} style={{padding:12,alignItems:"center",borderRadius:50}} start={{x:0,y:0}} end={{x:1,y:0}}>
                      {acting===a.id ? <ActivityIndicator size="small" color="#fff"/>
                        : <Text style={{fontSize:13,fontWeight:"900",color:"#fff"}}>✅ Approve — remove post</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{paddingHorizontal:16,borderRadius:50,padding:12,borderWidth:2,borderColor:"#fca5a5"}}
                    onPress={()=>handleAppeal(a.id,a.shameId,"rejected")} disabled={acting===a.id}
                  >
                    <Text style={{fontSize:13,fontWeight:"800",color:C.red}}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ num, lbl, gradient }) {
  return (
    <LinearGradient colors={gradient} style={{flex:1,borderRadius:16,padding:14,alignItems:"center"}} start={{x:0,y:0}} end={{x:1,y:1}}>
      <Text style={{fontSize:26,fontWeight:"900",color:"#fff"}}>{num}</Text>
      <Text style={{fontSize:10,color:"rgba(255,255,255,0.8)",marginTop:2,fontWeight:"800",textAlign:"center"}}>{lbl}</Text>
    </LinearGradient>
  );
}
