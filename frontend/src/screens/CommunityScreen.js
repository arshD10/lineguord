import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C, T } from "../theme";
import { listenToCommunity, postToCommunity, likePost } from "../firebase/helpers";
import { useAuth } from "../firebase/AuthContext";
import { showToast } from "../components/Toast";
import Toast from "../components/Toast";

const TOPICS = ["All","RTO","Railway","Airport","Hospital","Mall","Police","General"];
const GRAD_COLORS = [["#a855f7","#ec4899"],["#7c3aed","#db2777"],["#ec4899","#f97316"],["#06b6d4","#a855f7"],["#f97316","#ec4899"],["#10b981","#06b6d4"]];

export default function CommunityScreen() {
  const { user }  = useAuth();
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText]       = useState("");
  const [topic, setTopic]     = useState("All");
  const [myLikes, setMyLikes] = useState({});
  const [posting, setPosting] = useState(false);

  const displayName = user?.isAnonymous ? "Anonymous" : (user?.displayName?.split(" ")[0] || "User");

  useEffect(() => {
    const unsub = listenToCommunity(d => { setPosts(d); setLoading(false); });
    return () => unsub();
  }, []);

  const filtered = topic === "All" ? posts : posts.filter(p => p.topic === topic);

  async function handlePost() {
    if (!text.trim()) return;
    if (!user) { showToast("Sign in to post"); return; }
    setPosting(true);
    try {
      await postToCommunity({ text: text.trim(), displayName, topic: topic === "All" ? "General" : topic });
      setText("");
      showToast("🔥 Posted!");
    } catch { showToast("Error posting. Try again."); }
    finally { setPosting(false); }
  }

  async function handleLike(id) {
    if (!user) { showToast("Sign in to like"); return; }
    if (myLikes[id]) return;
    setMyLikes(l => ({ ...l, [id]: true }));
    try { await likePost(id, user.uid); }
    catch {}
  }

  function timeAgo(ts) {
    if (!ts?.toDate) return "just now";
    const s = Math.floor((Date.now()-ts.toDate().getTime())/1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  }

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.offWhite}}>
      <Toast />
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":"height"}>
        <LinearGradient colors={["#7c3aed","#a855f7"]} style={{paddingHorizontal:20,paddingBottom:12,paddingTop:14}} start={{x:0,y:0}} end={{x:1,y:0}}>
          <Text style={{fontSize:24,fontWeight:"900",color:"#fff",letterSpacing:-0.5}}>Community 💬</Text>
          <Text style={{fontSize:13,color:"rgba(255,255,255,0.7)",fontWeight:"700",marginTop:2,marginBottom:10}}>Queue culture talk · India & worldwide</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TOPICS.map(t => (
              <TouchableOpacity key={t} style={{paddingHorizontal:14,paddingVertical:7,borderRadius:50,marginRight:8,backgroundColor:topic===t?"#fff":"rgba(255,255,255,0.2)",borderWidth:topic===t?0:1.5,borderColor:"rgba(255,255,255,0.4)"}} onPress={()=>setTopic(t)}>
                <Text style={{fontSize:12,fontWeight:"900",color:topic===t?C.purple:"#fff"}}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {loading ? (
          <View style={T.emptyWrap}><ActivityIndicator size="large" color={C.purple}/></View>
        ) : (
          <ScrollView style={{flex:1}} contentContainerStyle={{padding:14,paddingBottom:20}}>
            {filtered.length === 0 && (
              <View style={[T.emptyWrap,{marginTop:20}]}>
                <Text style={{fontSize:40}}>💬</Text>
                <Text style={T.emptyText}>No posts yet.{"\n"}Start the conversation!</Text>
              </View>
            )}
            {filtered.map((post,idx) => {
              const gc = GRAD_COLORS[idx%GRAD_COLORS.length];
              const liked = myLikes[post.id] || post.likedBy?.[user?.uid];
              return (
                <View key={post.id} style={{backgroundColor:"#fff",borderRadius:20,padding:14,marginBottom:10,borderWidth:1.5,borderColor:C.border}}>
                  <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                      <LinearGradient colors={gc} style={{width:38,height:38,borderRadius:19,alignItems:"center",justifyContent:"center"}} start={{x:0,y:0}} end={{x:1,y:1}}>
                        <Text style={{color:"#fff",fontSize:16,fontWeight:"900"}}>{(post.displayName||"A")[0].toUpperCase()}</Text>
                      </LinearGradient>
                      <View>
                        <Text style={{fontSize:13,fontWeight:"900",color:C.textDark}}>{post.displayName||"Anonymous"}</Text>
                        <Text style={{fontSize:11,color:C.textPurple,fontWeight:"700"}}>⏱️ {timeAgo(post.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={{backgroundColor:C.offWhite,borderRadius:50,paddingHorizontal:10,paddingVertical:3,borderWidth:1.5,borderColor:C.border}}>
                      <Text style={{fontSize:10,fontWeight:"900",color:C.purple}}>{post.topic||"General"}</Text>
                    </View>
                  </View>
                  <Text style={{fontSize:14,color:C.textDark,lineHeight:21,fontWeight:"700",marginBottom:10}}>{post.text}</Text>
                  <TouchableOpacity
                    style={{flexDirection:"row",alignItems:"center",gap:6,paddingVertical:7,paddingHorizontal:14,borderRadius:50,alignSelf:"flex-start",overflow:"hidden",borderWidth:liked?0:1.5,borderColor:C.border}}
                    onPress={()=>handleLike(post.id)}
                  >
                    {liked && <LinearGradient colors={["#a855f7","#ec4899"]} style={{position:"absolute",top:0,left:0,right:0,bottom:0}} start={{x:0,y:0}} end={{x:1,y:0}}/>}
                    <Text style={{fontSize:14}}>❤️</Text>
                    <Text style={{fontSize:13,fontWeight:"900",color:liked?"#fff":C.purple,zIndex:1}}>{post.likes||0}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={{flexDirection:"row",gap:10,padding:12,borderTopWidth:1,borderColor:C.border,backgroundColor:"#fff",alignItems:"center"}}>
          <LinearGradient colors={["#a855f7","#ec4899"]} style={{width:38,height:38,borderRadius:19,alignItems:"center",justifyContent:"center",flexShrink:0}} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={{color:"#fff",fontSize:16,fontWeight:"900"}}>{displayName[0].toUpperCase()}</Text>
          </LinearGradient>
          <TextInput
            style={{flex:1,backgroundColor:C.offWhite,borderRadius:50,paddingHorizontal:16,paddingVertical:10,fontSize:14,color:C.textDark,fontWeight:"700",borderWidth:1.5,borderColor:C.border}}
            placeholder="Share your experience... 😤"
            placeholderTextColor={C.textPurple}
            value={text} onChangeText={setText}
            multiline maxLength={300}
          />
          <TouchableOpacity style={{width:42,height:42,borderRadius:21,overflow:"hidden",opacity:text.trim()?1:0.4}} onPress={handlePost} disabled={!text.trim()||posting}>
            <LinearGradient colors={["#a855f7","#ec4899"]} style={{width:"100%",height:"100%",alignItems:"center",justifyContent:"center"}} start={{x:0,y:0}} end={{x:1,y:1}}>
              {posting ? <ActivityIndicator size="small" color="#fff"/> : <Text style={{color:"#fff",fontSize:20,fontWeight:"900"}}>↑</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
