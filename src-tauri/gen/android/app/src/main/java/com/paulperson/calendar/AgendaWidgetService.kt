package com.paulperson.calendar

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONObject
import java.io.File

data class AgendaItem(
    val title: String,
    val time: String,
    val isTask: Boolean,
    val done: Boolean
)

class AgendaWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        AgendaRemoteViewsFactory(applicationContext)
}

class AgendaRemoteViewsFactory(private val context: Context) :
    RemoteViewsService.RemoteViewsFactory {

    private var items: List<AgendaItem> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        items = readAgenda()
    }

    /**
     * The web app writes this file via tauri-plugin-fs (AppData base dir),
     * which on Android resolves to the app data root (context.dataDir).
     */
    private fun agendaFile(): File? {
        val candidates = mutableListOf(
            File(context.dataDir, "widget-agenda.json"),
            File(context.filesDir, "widget-agenda.json"),
        )
        return candidates.firstOrNull { it.exists() }
    }

    private fun readAgenda(): List<AgendaItem> {
        val file = agendaFile() ?: return emptyList()
        return try {
            val root = JSONObject(file.readText())
            val arr = root.getJSONArray("items")
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                AgendaItem(
                    title = o.getString("title"),
                    time = o.getString("time"),
                    isTask = o.optBoolean("isTask"),
                    done = o.optBoolean("done")
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override fun getCount() = items.size

    override fun getViewAt(position: Int): RemoteViews {
        val item = items[position]
        val views = RemoteViews(context.packageName, R.layout.widget_agenda_item)
        views.setTextViewText(R.id.item_time, item.time)
        views.setTextViewText(R.id.item_title, item.title)
        // Task sessions green, events blue; done tasks muted + struck through.
        val color = when {
            item.done -> 0xFF9E9E9E.toInt()
            item.isTask -> 0xFF2E9E5B.toInt()
            else -> 0xFF3B82F6.toInt()
        }
        views.setInt(R.id.item_marker, "setColorFilter", color)
        views.setInt(
            R.id.item_title, "setPaintFlags",
            if (item.done) Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG
            else Paint.ANTI_ALIAS_FLAG
        )
        // Required so the list rows inherit the widget's click PendingIntent.
        views.setOnClickFillInIntent(R.id.item_root, Intent())
        return views
    }

    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount() = 1
    override fun getItemId(position: Int) = position.toLong()
    override fun hasStableIds() = false
    override fun onDestroy() {}
}
