package com.painelure.app
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.painelure.app.ui.theme.*

class MainActivity: ComponentActivity() { override fun onCreate(b:Bundle?) { super.onCreate(b); setContent { PainelURETheme { PainelUREApp() } } } }
@Composable private fun PainelUREApp() { var tab by remember { mutableStateOf(0) }; val labels=listOf("Painel","Escolas","Redes","Agenda","Mais"); Scaffold(bottomBar={ NavigationBar(containerColor=Surface) { labels.forEachIndexed { i,l -> NavigationBarItem(selected=tab==i,onClick={tab=i},icon={Icon(if(i==0)Icons.Default.Home else if(i==1)Icons.Default.School else if(i==2)Icons.Default.Public else if(i==3)Icons.Default.Event else Icons.Default.Menu,l)},label={Text(l)}) } } }) { p -> LazyColumn(Modifier.fillMaxSize().padding(p).padding(horizontal=20.dp),verticalArrangement=Arrangement.spacedBy(14.dp),contentPadding=PaddingValues(top=28.dp,bottom=28.dp)) { item { Text("PAINELURE",style=MaterialTheme.typography.labelLarge,color=Lime); Text(if(tab==0) "Bom dia, Jefferson" else labels[tab],style=MaterialTheme.typography.headlineLarge); Text("Centro operacional da URE",color=Muted) }; if(tab==0) { item { HeroCard() }; item { Section("Acesso rápido") }; items(listOf("Escolas","Redes e câmeras","Inventário","Supervisão")) { QuickCard(it) } } else { item { Section(labels[tab]) }; items(6) { QuickCard("Módulo ${it+1}") } } } } }
@Composable private fun HeroCard(){ Card(colors=CardDefaults.cardColors(containerColor=Surface),shape=RoundedCornerShape(24.dp),modifier=Modifier.fillMaxWidth()){ Column(Modifier.padding(22.dp)){ Text("VISÃO GERAL",color=Mint,style=MaterialTheme.typography.labelMedium); Text("Tudo sob controle.",style=MaterialTheme.typography.headlineSmall); Spacer(Modifier.height(14.dp)); Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){ Metric("12","Escolas"); Metric("08","Pendências"); Metric("04","Agenda") } } } }
@Composable private fun Metric(v:String,l:String){ Column { Text(v,style=MaterialTheme.typography.titleLarge,color=Lime); Text(l,color=Muted,style=MaterialTheme.typography.bodySmall) } }
@Composable private fun Section(s:String){ Text(s,style=MaterialTheme.typography.titleLarge) }
@Composable private fun QuickCard(s:String){ Card(colors=CardDefaults.cardColors(containerColor=Surface),shape=RoundedCornerShape(18.dp),modifier=Modifier.fillMaxWidth()){ Row(Modifier.padding(18.dp),verticalAlignment=Alignment.CenterVertically){ Icon(Icons.Default.ChevronRight,null,tint=Lime); Spacer(Modifier.width(12.dp)); Text(s,style=MaterialTheme.typography.titleMedium); Spacer(Modifier.weight(1f)); Text("Consultar",color=Muted,style=MaterialTheme.typography.bodySmall) } } }
