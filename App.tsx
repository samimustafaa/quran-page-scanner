import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import corpus from './src/pages.json';
import {scanImage} from './src/api';
import type {QuranPage} from './src/types';

const pages = corpus as QuranPage[];
const C = {bg:'#F8F6F0', paper:'#FFFEFA', ink:'#233F38', muted:'#75847A', line:'#E2E6DA', green:'#294E42', gold:'#B49357', light:'#EAF0E5'};
type IconName = React.ComponentProps<typeof Feather>['name'];
function Icon({name, size=22, color=C.ink}:{name:IconName;size?:number;color?:string}) {return <Feather name={name} size={size} color={color}/>;}
function Button({label, onPress, secondary=false, disabled=false, icon}:{label:string;onPress:()=>void;secondary?:boolean;disabled?:boolean;icon?:IconName}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[s.button, secondary && s.secondary, {opacity:disabled?.45:pressed?.8:1, transform:[{scale:pressed?.985:1}]}]}>{icon && <Icon name={icon} color={secondary?C.ink:'#fff'}/>}<Text style={[s.buttonText,secondary&&{color:C.ink}]}>{label}</Text></Pressable>;
}
function AppContent() {
  const [tab,setTab]=useState<'home'|'saved'|'settings'>('home');
  const [reader,setReader]=useState<QuranPage|null>(null);
  const [photo,setPhoto]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [candidates,setCandidates]=useState<number[]>([]);
  const [manual,setManual]=useState('');
  const [saved,setSaved]=useState<number[]>([]);
  const [recent,setRecent]=useState<number[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [font,setFont]=useState(19);
  const [arabic,setArabic]=useState(false);
  const [update,setUpdate]=useState(false);
  const fade=useRef(new Animated.Value(0)).current;
  const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(()=>{Animated.timing(fade,{toValue:1,duration:650,useNativeDriver:true}).start();
    AsyncStorage.getItem('mushaf-state-v1').then(raw=>{
      if(raw) {const data=JSON.parse(raw);const valid=(v:unknown):v is number=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=604;
        setSaved(Array.isArray(data.saved)?data.saved.filter(valid):[]);setRecent(Array.isArray(data.recent)?data.recent.filter(valid):[]);
        if([17,19,22,25].includes(data.font))setFont(data.font);
      }
    }).catch(()=>setError('Të dhënat e ruajtura nuk u lexuan.')).finally(()=>setLoaded(true));
    if(!__DEV__&&Platform.OS!=='web'&&Updates.isEnabled) {
      Updates.checkForUpdateAsync().then(async result=>{if(result.isAvailable){await Updates.fetchUpdateAsync();setUpdate(true);}}).catch(()=>{});
    }
  },[]);
  useEffect(()=>{if(loaded)AsyncStorage.setItem('mushaf-state-v1',JSON.stringify({saved,recent,font})).catch(()=>setError('Ruajtja në pajisje dështoi.'));},[saved,recent,font,loaded]);
  function openPage(n:number) {if(!Number.isInteger(n)||n<1||n>604){setError('Shkruaj një numër nga 1 deri në 604.');return;}
    setReader(pages[n-1]);setRecent(old=>[n,...old.filter(p=>p!==n)].slice(0,20));setError('');setCandidates([]);setTimeout(()=>scroll.current?.scrollTo({y:0,animated:false}),0);
  }
  async function choose(camera:boolean) {
    setError('');setCandidates([]);
    try {
      if(camera){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted){setError('Lejo kamerën te cilësimet e telefonit ose ngarko një fotografi.');return;}}
      const options:ImagePicker.ImagePickerOptions={mediaTypes:['images'],quality:1,allowsEditing:false,exif:false};
      const picked=camera?await ImagePicker.launchCameraAsync(options):await ImagePicker.launchImageLibraryAsync(options);
      if(picked.canceled)return;
      const resized=await ImageManipulator.manipulateAsync(picked.assets[0].uri,[{resize:{width:1800}}],{compress:.88,format:ImageManipulator.SaveFormat.JPEG});
      setPhoto(resized.uri);
    } catch {setError('Fotografia nuk u hap. Provo një fotografi tjetër.');}
  }
  async function scan() {
    if(!photo||busy)return;setBusy(true);setError('');
    try {const result=await scanImage(photo);setPhoto(null);
      if(result.status==='matched'&&result.result)openPage(result.result.page);
      else {setError('Nuk u gjet një përputhje e sigurt. Provo një foto më të qartë, të një faqeje të vetme, ose zgjidhe faqen vetë.');setCandidates(result.candidates.map(c=>c.page));}
    } catch(e){setError(e instanceof Error?e.message:'Lidhja dështoi. Provo përsëri.');setPhoto(null);}
    finally{setBusy(false);}
  }
  function toggleSaved() {if(reader)setSaved(old=>old.includes(reader.page)?old.filter(n=>n!==reader.page):[reader.page,...old]);}
  const header=<View style={s.header}><View style={s.brand}><View style={s.brandIcon}><Icon name="book-open" color="#fff" size={21}/></View><View><Text style={s.brandName}>Mus’haf <Text style={{fontWeight:'400'}}>Scan</Text></Text><Text style={s.brandSub}>LEXO. KUPTO. REFLEKTO.</Text></View></View><View style={s.language}><Text style={s.languageText}>SQ</Text></View></View>;
  return <SafeAreaView style={s.safe} edges={['top','bottom']}><StatusBar style="dark"/>{header}
    <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {reader ? <View>
      <View style={s.rowBetween}><Pressable accessibilityRole="button" onPress={()=>setReader(null)} style={s.back}><Icon name="arrow-left" size={18}/><Text style={s.small}>Kthehu</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Ruaj faqen" onPress={toggleSaved} style={s.iconButton}><Icon name={saved.includes(reader.page)?'check':'bookmark'}/></Pressable></View>
      <Text style={s.eyebrow}>PËRKTHIMI I FAQES</Text><Text style={s.title}>Faqja {reader.page}<Text style={{color:C.gold}}> .</Text></Text>
      <Text style={s.description}>{reader.surahs.join(' · ')}</Text><View style={s.chips}><Text style={s.chip}>Xhuzi {reader.juz.join(', ')}</Text><Text style={s.chip}>{reader.verses.length} ajete</Text><Text style={s.chip}>Shqip</Text></View>
      <View style={s.toolbar}><Text style={s.small}>Sherif Ahmeti</Text><Pressable accessibilityRole="button" onPress={()=>setArabic(!arabic)}><Text style={[s.small,{color:C.green,fontWeight:'700'}]}>{arabic?'Fshih arabishten':'Shfaq arabishten'}</Text></Pressable></View>
      {reader.verses.map((verse,i)=><View key={verse.key} style={s.verse}>{(i===0||reader.verses[i-1].surahNumber!==verse.surahNumber)&&<Text style={s.surahLabel}>{verse.surah} · {verse.surahArabic}</Text>}<View style={s.verseHead}><Text style={s.verseNumber}>{verse.key}</Text></View>{arabic&&<Text style={s.arabic}>{verse.arabic}</Text>}<Text selectable style={[s.translation,{fontSize:font,lineHeight:font*1.65}]}>{verse.translation}</Text></View>)}
      <Text style={s.footnote}>Përkthimi i kuptimeve: Sherif Ahmeti · AlQuran Cloud{ '\n'}Faqosja e Mus’hafit të Medinës, 604 faqe.</Text>
      <View style={s.pagination}><Button label="E mëparshme" secondary disabled={reader.page===1} onPress={()=>openPage(reader.page-1)}/><Button label="Tjetra" disabled={reader.page===604} onPress={()=>openPage(reader.page+1)}/></View>
    </View> : <Animated.View style={{opacity:fade}}>
    {tab==='home'&&<>
      <View style={s.kicker}><View style={s.dot}/><Text style={s.kickerText}>KURANI, MË PRANË TEJE</Text></View>
      <Text style={s.hero}>Një faqe.{'\n'}Më shumë <Text style={s.italic}>kuptim.</Text></Text>
      <Text style={s.description}>Fotografo një faqe të Kuranit dhe lexo përkthimin e saj në shqip.</Text>
      <View style={s.scanCard}>
        <View style={s.cardTop}><Text style={s.cardKicker}>NIS ME NJË FOTOGRAFI</Text><Icon name="aperture" size={18} color={C.gold}/></View>
        <View style={s.viewfinder}><View style={s.cornerTL}/><View style={s.cornerTR}/><View style={s.cornerBL}/><View style={s.cornerBR}/><View style={s.bookArt}><Icon name="book-open" size={65} color={C.gold}/><View style={s.bookLine}/><Text style={s.bookText}>القرآن الكريم</Text></View><Text style={s.viewfinderText}>Nga faqja, te kuptimi i saj</Text></View>
        <Button label="Fotografo faqen" icon="camera" onPress={()=>choose(true)}/><View style={{height:10}}/><Button label="Ngarko nga galeria" secondary icon="image" onPress={()=>choose(false)}/>
        <Text style={s.cardHint}>Një faqe e vetme · Dritë e mirë · Tekst i qartë</Text>
      </View>
      <View style={s.manual}><View style={s.rowBetween}><Text style={s.sectionTitle}>E di numrin e faqes?</Text><Icon name="hash" size={18} color={C.muted}/></View><Text style={s.small}>Hape direkt, edhe pa internet.</Text><View style={s.inputRow}><TextInput accessibilityLabel="Numri i faqes" style={s.input} placeholder="1–604" placeholderTextColor={C.muted} keyboardType="number-pad" value={manual} onChangeText={setManual} maxLength={3} onSubmitEditing={()=>openPage(Number(manual))}/><Pressable accessibilityRole="button" accessibilityLabel="Hap faqen" onPress={()=>openPage(Number(manual))} style={s.go}><Icon name="arrow-right" color="#fff"/></Pressable></View></View>
      {recent.length>0&&<View style={s.recent}><Text style={s.sectionTitle}>Vazhdo leximin</Text><Pressable accessibilityRole="button" onPress={()=>openPage(recent[0])} style={s.recentCard}><View style={s.pageBadge}><Text style={s.pageBadgeText}>{recent[0]}</Text></View><View style={{flex:1}}><Text style={s.sectionTitle}>{pages[recent[0]-1].surahs.join(' · ')}</Text><Text style={s.small}>Faqja {recent[0]} · Xhuzi {pages[recent[0]-1].juz.join(', ')}</Text></View><Icon name="arrow-up-right" size={20}/></Pressable></View>}
      <View style={s.note}><Icon name="info" size={17} color={C.muted}/><Text style={[s.small,{flex:1,lineHeight:20}]}>Për Mus’hafin e Medinës me 604 faqe. Faqosjet e tjera mund të ndryshojnë. Përkthim nga Sherif Ahmeti.</Text></View>
    </>}
    {tab==='saved'&&<><Text style={s.eyebrow}>BIBLIOTEKA JOTE</Text><Text style={s.title}>Faqet e ruajtura.</Text><Text style={s.description}>Kthehu te kuptimet që dëshiron t’i lexosh sërish.</Text>{saved.length===0?<View style={s.empty}><Icon name="bookmark" size={38} color={C.gold}/><Text style={s.sectionTitle}>Një vend për reflektim</Text><Text style={s.description}>Prek shenjën e ruajtjes kur lexon një faqe.</Text></View>:saved.map(n=><Pressable accessibilityRole="button" key={n} onPress={()=>openPage(n)} style={s.recentCard}><View style={s.pageBadge}><Text style={s.pageBadgeText}>{n}</Text></View><View style={{flex:1}}><Text style={s.sectionTitle}>{pages[n-1].surahs.join(' · ')}</Text><Text style={s.small}>Faqja {n} · Xhuzi {pages[n-1].juz.join(', ')}</Text></View><Icon name="chevron-right"/></Pressable>)}</>}
    {tab==='settings'&&<><Text style={s.eyebrow}>SIPAS MËNYRËS SATE</Text><Text style={s.title}>Cilësimet.</Text><View style={s.settingsCard}><Text style={s.sectionTitle}>Madhësia e tekstit</Text><View style={s.chips}>{[17,19,22,25].map(n=><Pressable accessibilityRole="button" accessibilityLabel={`Teksti ${n}`} key={n} onPress={()=>setFont(n)} style={[s.sizeOption,font===n&&{backgroundColor:C.green}]}><Text style={{fontSize:n,color:font===n?'#fff':C.ink}}>Aa</Text></Pressable>)}</View><Text style={[s.translation,{fontSize:font,lineHeight:font*1.6}]}>Lexo me qetësi dhe kupto çdo ajet.</Text></View>
      <View style={s.settingsCard}><Text style={s.sectionTitle}>Përkthimi dhe burimi</Text><Text style={s.description}>Shqip · Sherif Ahmeti{ '\n'}Teksti arabisht: Uthmani{ '\n'}Burimi: AlQuran Cloud{ '\n'}604 faqe · 6,236 ajete</Text></View>
      <View style={s.settingsCard}><Text style={s.sectionTitle}>Privatësia e fotografive</Text><Text style={s.description}>Skanimi dërgon fotografinë te shërbimi ynë dhe Google Cloud Vision për të lexuar tekstin arabisht. Aplikacioni nuk e ruan fotografinë në server. Faqet e ruajtura dhe leximi i fundit qëndrojnë në këtë pajisje.</Text></View>
      <View style={s.settingsCard}><Text style={s.sectionTitle}>Përditësimet</Text><Text style={s.description}>{update?'Përditësimi u shkarkua. Do të zbatohet kur ta hapësh sërish aplikacionin.':'Në versionin e instaluar, përditësimet e përshtatshme shkarkohen në sfond dhe zbatohen në hapjen e radhës.'}</Text><Text style={s.footnote}>Ndryshimet vendase kërkojnë version të ri nga dyqani.</Text></View>
      <Button label="Fshi historikun e leximit" secondary onPress={()=>{setRecent([]);}}/><Text style={s.footnote}>Mus’haf Scan · 1.0.0{ '\n'}Krijuar nga Sami Mustafa</Text>
    </>}
    </Animated.View>}
    {!!error&&<View accessibilityRole="alert" style={s.error}><Icon name="alert-circle" size={20}/><Text style={s.errorText}>{error}</Text></View>}
    {candidates.length>0&&<View style={s.settingsCard}><Text style={s.sectionTitle}>Faqe të mundshme — kontrolloji vetë</Text>{candidates.map(n=><Pressable accessibilityRole="button" style={s.candidate} key={n} onPress={()=>openPage(n)}><Text style={s.small}>Faqja {n} · {pages[n-1].surahs.join(', ')}</Text><Icon name="arrow-right" size={17}/></Pressable>)}</View>}
    </ScrollView>
    <View style={s.nav}>{([{id:'home',icon:'aperture',label:'Skano'},{id:'saved',icon:'bookmark',label:'Të ruajtura'},{id:'settings',icon:'sliders',label:'Cilësimet'}] as const).map(item=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===item.id&&!reader}} key={item.id} style={s.navItem} onPress={()=>{setTab(item.id);setReader(null);setError('');setCandidates([]);scroll.current?.scrollTo({y:0,animated:false});}}><Icon name={item.icon} color={tab===item.id?C.green:C.muted} size={21}/><Text style={[s.navLabel,tab===item.id&&{color:C.green,fontWeight:'700'}]}>{item.label}</Text></Pressable>)}</View>
    <Modal visible={!!photo} animationType="slide" onRequestClose={()=>{if(!busy)setPhoto(null);}}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>KONTROLLO FOTOGRAFINË</Text><Text style={s.title}>Gati për skanim?</Text>{photo&&<Image source={{uri:photo}} style={s.preview} resizeMode="contain"/>}<View style={s.note}><Icon name="shield" size={20}/><Text style={[s.small,{flex:1,lineHeight:21}]}>Duke vazhduar, dërgon këtë fotografi te shërbimi ynë dhe Google Cloud Vision për njohjen e tekstit. Fotografo vetëm faqen e Kuranit.</Text></View>{busy?<View style={s.loading}><ActivityIndicator size="large" color={C.green}/><Text style={s.sectionTitle}>Po kërkojmë faqen…</Text><Text style={s.small}>Po krahasojmë tekstin me Kuranin.</Text></View>:<><Button label="Gjej përkthimin" icon="search" onPress={scan}/><View style={{height:12}}/><Button label="Zgjidh tjetër fotografi" secondary onPress={()=>setPhoto(null)}/></>}</ScrollView></SafeAreaView></Modal>
  </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><AppContent/></SafeAreaProvider>;}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{padding:24,paddingBottom:40,width:'100%',maxWidth:600,alignSelf:'center'},header:{paddingHorizontal:24,paddingVertical:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:C.line},brand:{flexDirection:'row',alignItems:'center',gap:10},brandIcon:{width:39,height:43,backgroundColor:C.green,borderRadius:13,alignItems:'center',justifyContent:'center'},brandName:{fontSize:21,fontWeight:'700',color:C.ink,letterSpacing:-.6},brandSub:{fontSize:8,color:C.muted,letterSpacing:1.8,marginTop:3},language:{borderWidth:1,borderColor:C.line,borderRadius:20,paddingHorizontal:12,paddingVertical:7},languageText:{fontSize:11,fontWeight:'700',color:C.green},kicker:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12},dot:{width:6,height:6,borderRadius:3,backgroundColor:C.gold},kickerText:{fontSize:9,fontWeight:'700',letterSpacing:2,color:C.muted},hero:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:36,lineHeight:44,color:C.ink,letterSpacing:-1.8,marginTop:20,marginBottom:14},italic:{fontStyle:'italic',color:C.gold},description:{fontSize:15,lineHeight:25,color:C.muted,marginTop:8},scanCard:{backgroundColor:C.paper,borderColor:C.line,borderWidth:1,borderRadius:24,padding:20,marginTop:27,boxShadow:'0px 10px 30px rgba(35,63,56,0.04)'},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},cardKicker:{fontSize:9,fontWeight:'700',letterSpacing:1.8,color:C.muted},viewfinder:{height:168,alignItems:'center',justifyContent:'center',marginVertical:22,marginHorizontal:9},cornerTL:{position:'absolute',top:0,left:0,width:24,height:24,borderLeftWidth:1.5,borderTopWidth:1.5,borderColor:'#B9C8B6',borderTopLeftRadius:12},cornerTR:{position:'absolute',top:0,right:0,width:24,height:24,borderRightWidth:1.5,borderTopWidth:1.5,borderColor:'#B9C8B6',borderTopRightRadius:12},cornerBL:{position:'absolute',bottom:0,left:0,width:24,height:24,borderLeftWidth:1.5,borderBottomWidth:1.5,borderColor:'#B9C8B6',borderBottomLeftRadius:12},cornerBR:{position:'absolute',bottom:0,right:0,width:24,height:24,borderRightWidth:1.5,borderBottomWidth:1.5,borderColor:'#B9C8B6',borderBottomRightRadius:12},bookArt:{alignItems:'center',gap:12},bookLine:{height:1,width:90,backgroundColor:'#D9CBAA'},bookText:{fontSize:23,color:C.green,fontFamily:'serif'},viewfinderText:{fontSize:10,color:C.muted,marginTop:17,letterSpacing:.5},button:{backgroundColor:C.green,minHeight:54,borderRadius:14,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:10,paddingHorizontal:16},secondary:{backgroundColor:C.light,borderWidth:1,borderColor:'#DEE5D9'},buttonText:{fontSize:14,fontWeight:'600',color:'#fff'},cardHint:{fontSize:10,color:C.muted,textAlign:'center',marginTop:17},manual:{marginTop:26},rowBetween:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},sectionTitle:{fontSize:15,fontWeight:'600',color:C.ink,lineHeight:22},small:{fontSize:12,color:C.muted,lineHeight:21},inputRow:{flexDirection:'row',gap:10,marginTop:14},input:{flex:1,backgroundColor:C.paper,borderColor:C.line,borderWidth:1,borderRadius:13,padding:14,fontSize:16,color:C.ink},go:{width:54,backgroundColor:C.green,borderRadius:13,alignItems:'center',justifyContent:'center'},note:{flexDirection:'row',gap:10,marginTop:24,paddingVertical:15,borderTopWidth:1,borderTopColor:C.line},recent:{marginTop:26},recentCard:{flexDirection:'row',gap:13,alignItems:'center',padding:15,marginTop:12,backgroundColor:C.paper,borderRadius:15,borderWidth:1,borderColor:C.line},pageBadge:{width:42,height:45,backgroundColor:C.light,borderRadius:10,alignItems:'center',justifyContent:'center'},pageBadgeText:{fontSize:14,fontWeight:'700',color:C.green},nav:{flexDirection:'row',paddingVertical:13,borderTopWidth:1,borderTopColor:C.line,backgroundColor:C.paper},navItem:{flex:1,alignItems:'center',gap:6,paddingVertical:3},navLabel:{fontSize:10,color:C.muted},eyebrow:{fontSize:10,fontWeight:'600',letterSpacing:2,color:C.gold,marginTop:23},title:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:38,color:C.ink,letterSpacing:-1,marginTop:14,marginBottom:4},empty:{alignItems:'center',gap:18,padding:30,marginTop:45},settingsCard:{borderWidth:1,borderColor:C.line,borderRadius:18,padding:20,marginTop:22,backgroundColor:C.paper},sizeOption:{minWidth:50,minHeight:48,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:C.light},chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:19},chip:{fontSize:11,color:C.green,backgroundColor:C.light,paddingVertical:7,paddingHorizontal:12,borderRadius:9},back:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8},iconButton:{padding:10,borderWidth:1,borderColor:C.line,borderRadius:12},toolbar:{flexDirection:'row',justifyContent:'space-between',paddingVertical:16,borderTopWidth:1,borderTopColor:C.line},verse:{paddingVertical:20,borderBottomWidth:1,borderBottomColor:C.line},verseHead:{flexDirection:'row',marginBottom:10},verseNumber:{color:C.gold,fontSize:12,fontWeight:'600'},surahLabel:{fontSize:16,fontWeight:'600',color:C.green,marginBottom:20},translation:{color:C.ink,fontFamily:Platform.OS==='ios'?'Georgia':'serif'},arabic:{fontSize:28,lineHeight:53,textAlign:'right',writingDirection:'rtl',color:C.green,marginBottom:18},footnote:{textAlign:'center',fontSize:10,lineHeight:18,color:C.muted,marginVertical:24},pagination:{flexDirection:'row',justifyContent:'space-between',gap:10},error:{backgroundColor:'#F1E5D9',borderRadius:14,padding:16,flexDirection:'row',gap:10,marginTop:20},errorText:{flex:1,color:C.ink,fontSize:13,lineHeight:22},candidate:{paddingVertical:15,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:'row',justifyContent:'space-between'},preview:{height:350,width:'100%',backgroundColor:C.light,borderRadius:18,marginTop:24},loading:{alignItems:'center',gap:15,padding:24}
});
